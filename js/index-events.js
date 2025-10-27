// Index Events - Handles events specific to index.html
console.log('index-events.js loaded successfully');

// Global function to focus search input when clicking wrapper
function focusSearchInput() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.focus();
    }
}

class IndexPageManager {
    constructor() {
        this.currentFilter = 'agents';
        this.currentCategoryFilter = 'all';
        this.currentSort = 'downloads'; // Default sort by downloads
        this.templatesData = null;
        this.componentsData = null;
        this.availableCategories = {
            agents: new Set(),
            commands: new Set(),
            mcps: new Set(),
            settings: new Set(),
            hooks: new Set(),
            skills: new Set(),
            templates: new Set(),
            plugins: new Set()
        };
        
        // Pagination settings
        this.currentPage = 1;
        this.itemsPerPage = 24; // 3x3 grid
        this.totalPages = 1;
        
        // Framework icons mapping (from script.js)
        this.FRAMEWORK_ICONS = {
            // Languages
            'common': 'devicon-gear-plain',
            'javascript-typescript': 'devicon-javascript-plain',
            'python': 'devicon-python-plain',
            'ruby': 'devicon-ruby-plain',
            'rust': 'devicon-rust-plain',
            'go': 'devicon-go-plain',
            
            // JavaScript/TypeScript frameworks
            'react': 'devicon-react-original',
            'vue': 'devicon-vuejs-plain',
            'angular': 'devicon-angularjs-plain',
            'node': 'devicon-nodejs-plain',
            
            // Python frameworks
            'django': 'devicon-django-plain',
            'flask': 'devicon-flask-original',
            'fastapi': 'devicon-fastapi-plain',
            
            // Ruby frameworks
            'rails': 'devicon-rails-plain',
            'sinatra': 'devicon-ruby-plain',
            
            // Default fallback
            'default': 'devicon-devicon-plain'
        };
    }

    async init() {
        try {
            // Setup event listeners first (they don't depend on data)
            this.setupEventListeners();

            // Show loading state
            this.showLoadingState(true);

            // Load all components and templates at once
            await this.loadComponentsData();
            await this.loadTemplatesData();

            // Check if URL has a specific filter and update accordingly
            const filterFromURL = this.getFilterFromURL();
            if (filterFromURL && filterFromURL !== this.currentFilter) {
                this.currentFilter = filterFromURL;

                // Update active filter chip
                document.querySelectorAll('.component-type-filters .filter-chip').forEach(btn => {
                    btn.classList.remove('active');
                });
                const activeBtn = document.querySelector(`.component-type-filters [data-filter="${filterFromURL}"]`);
                if (activeBtn) {
                    activeBtn.classList.add('active');
                }
            }

            // Update sort selector for initial filter
            this.updateSortSelector();

            // Display components
            this.displayCurrentFilter();

            // Show category filters for the current filter
            if (typeof showCategoryFilters === 'function') {
                showCategoryFilters(this.currentFilter);
            }

        } catch (error) {
            console.error('Error initializing index page:', error);
            this.showError('Failed to load data. Please refresh the page.');
        } finally {
            this.showLoadingState(false);
        }
    }

    // Get filter from URL path
    getFilterFromURL() {
        const path = window.location.pathname;
        const segments = path.split('/').filter(segment => segment);

        // Check if first segment is a valid filter
        const validFilters = ['agents', 'commands', 'settings', 'hooks', 'mcps', 'skills', 'templates', 'plugins'];
        const firstSegment = segments[0];

        if (firstSegment && validFilters.includes(firstSegment)) {
            return firstSegment;
        }

        // Default to agents
        return 'agents';
    }

    async loadTemplatesData() {
        try {
            // Templates are now loaded from components.json, not GitHub
            this.templatesData = await window.dataLoader.loadTemplates();
            
            // Update display if templates were found
            if (this.templatesData && Object.keys(this.templatesData).length > 0) {
                this.displayCurrentFilter();
            }
        } catch (error) {
            console.warn('Templates not available in components.json:', error);
            // Continue without templates - this is not critical
        }
    }

    async loadComponentsData() {
        try {
            // Load all components at once - the performance issue was mostly due to GitHub fetching
            // Now that we only use components.json, we can load all data safely
            this.componentsData = await window.dataLoader.loadAllComponents();
            this.collectAvailableCategories();
        } catch (error) {
            console.error('Error loading components:', error);
            // Use fallback data
            this.componentsData = window.dataLoader.getFallbackComponentData();
            this.collectAvailableCategories();
        }
    }
    
    // This method is no longer needed since we load all components at once
    // Kept for backward compatibility but does nothing
    async loadMoreComponentsInBackground() {
        // No-op: All components are now loaded in the initial request
        console.log('All components loaded in initial request - background loading not needed');
    }
    
    // Check if data object is empty
    isDataEmpty(data) {
        return !data || ((!data.agents || data.agents.length === 0) &&
                         (!data.commands || data.commands.length === 0) &&
                         (!data.mcps || data.mcps.length === 0) &&
                         (!data.settings || data.settings.length === 0) &&
                         (!data.hooks || data.hooks.length === 0));
    }
    
    // Show/hide loading state
    showLoadingState(isLoading) {
        const loadingElements = document.querySelectorAll('.loading-indicator, .loading-spinner');
        const contentElements = document.querySelectorAll('#unifiedGrid, .filter-controls');
        
        loadingElements.forEach(el => {
            el.style.display = isLoading ? 'flex' : 'none';
        });
        
        contentElements.forEach(el => {
            el.style.opacity = isLoading ? '0.7' : '1';
        });
    }

    setupEventListeners() {
        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filter = e.target.dataset.filter;
                this.setFilter(filter);
            });
        });

        // Copy buttons
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('copy-btn')) {
                const command = e.target.previousElementSibling.textContent;
                this.copyToClipboard(command);
            }
        });
        
        // Card flip functionality for template cards
        document.addEventListener('click', (e) => {
            const card = e.target.closest('.template-card');
            // Prevent flipping for "add new" cards or if a button is clicked
            if (card && !card.classList.contains('add-template-card') && !e.target.closest('button')) {
                console.log('Global template card clicked, toggling flip');
                card.classList.toggle('flipped');
            }
        });
        
        // ESC key to close all flipped cards
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.template-card.flipped').forEach(card => {
                    card.classList.remove('flipped');
                });
            }
        });
    }

    setFilter(filter) {
        this.currentFilter = filter;
        this.currentPage = 1; // Reset to first page when changing filter
        this.currentCategoryFilter = 'all'; // Reset category filter to show all items

        // Update active button
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });

        // Update sort selector options based on filter
        this.updateSortSelector();

        this.displayCurrentFilter();

        // Show category filters for the new filter
        if (typeof showCategoryFilters === 'function') {
            showCategoryFilters(filter);
        }
    }

    // Update sort selector based on current filter
    updateSortSelector() {
        const sortSelector = document.getElementById('sortSelector');
        if (!sortSelector) return;

        const currentValue = sortSelector.value;

        if (this.currentFilter === 'agents') {
            // Add "Verified" option for agents if it doesn't exist
            const verifiedOption = Array.from(sortSelector.options).find(opt => opt.value === 'verified');
            if (!verifiedOption) {
                const option = document.createElement('option');
                option.value = 'verified';
                option.textContent = 'Verified First';
                sortSelector.insertBefore(option, sortSelector.options[0]);
            }
        } else {
            // Remove "Verified" option for other filters
            const verifiedOption = Array.from(sortSelector.options).find(opt => opt.value === 'verified');
            if (verifiedOption) {
                verifiedOption.remove();
                // Reset to downloads if verified was selected
                if (currentValue === 'verified') {
                    sortSelector.value = 'downloads';
                    this.currentSort = 'downloads';
                }
            }
        }
    }

    // Set category filter
    setCategoryFilter(category) {
        this.currentCategoryFilter = category;
        this.currentPage = 1; // Reset to first page when changing category
        
        // Update category filter buttons
        document.querySelectorAll('.category-filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const targetBtn = document.querySelector(`[data-category="${category}"]`);
        if (targetBtn) {
            targetBtn.classList.add('active');
        }
        
        // Regenerate the component display
        this.displayCurrentFilter();
    }

    // Update category sub-filters in the unified-filter-bar
    updateCategorySubFilters() {
        const unifiedFilterBar = document.querySelector('.unified-filter-bar');
        if (!unifiedFilterBar) return;
        
        // Remove existing category filters
        const existingCategoryFilters = unifiedFilterBar.querySelector('.category-filter-row');
        if (existingCategoryFilters) {
            existingCategoryFilters.remove();
        }
        
        // Get categories for current filter type
        const currentCategories = Array.from(this.availableCategories[this.currentFilter] || []).sort();
        
        if (currentCategories.length <= 1) {
            // Don't show sub-filters if there's only one category or none
            return;
        }
        
        // Create category filter row
        const categoryFilterRow = document.createElement('div');
        categoryFilterRow.className = 'category-filter-row';
        categoryFilterRow.innerHTML = `
            <div class="category-filter-label">Categories:</div>
            <div class="category-filter-buttons">
                <button class="category-filter-btn ${this.currentCategoryFilter === 'all' ? 'active' : ''}" 
                        data-category="all">
                    All
                </button>
                ${currentCategories.map(category => `
                    <button class="category-filter-btn ${this.currentCategoryFilter === category ? 'active' : ''}" 
                            data-category="${category}">
                        ${this.formatComponentName(category)}
                    </button>
                `).join('')}
            </div>
        `;
        
        // Add click event listeners
        categoryFilterRow.querySelectorAll('.category-filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.setCategoryFilter(btn.getAttribute('data-category'));
            });
        });
        
        // Append to unified filter bar
        unifiedFilterBar.appendChild(categoryFilterRow);
    }

    // Get filtered components based on current filter and category filter
    getFilteredComponents(type) {
        if (!type) type = this.currentFilter;
        if (type === 'templates') {
            return [];
        }
        
        let components = this.componentsData[type] || [];
        
        // Apply category filter if not 'all'
        if (this.currentCategoryFilter !== 'all') {
            components = components.filter(component => {
                const category = component.category || 'general';
                return category === this.currentCategoryFilter;
            });
        }
        
        // Apply sorting
        components = this.sortComponents(components);
        
        return components;
    }
    
    // Sort components based on current sort option
    sortComponents(components) {
        const sortedComponents = [...components]; // Create a copy to avoid mutating original

        if (this.currentSort === 'downloads') {
            // Sort by downloads (descending) - components with no downloads go to the end
            sortedComponents.sort((a, b) => {
                const downloadsA = a.downloads || 0;
                const downloadsB = b.downloads || 0;
                return downloadsB - downloadsA;
            });
        } else if (this.currentSort === 'alphabetical') {
            // Sort alphabetically by name
            sortedComponents.sort((a, b) => {
                const nameA = (a.name || '').toLowerCase();
                const nameB = (b.name || '').toLowerCase();
                return nameA.localeCompare(nameB);
            });
        } else if (this.currentSort === 'verified') {
            // Sort by verified status first (100% score), then by downloads
            sortedComponents.sort((a, b) => {
                // Check if component has 100% validation score
                const aVerified = a.security && a.security.validated && a.security.score === 100 && a.security.valid;
                const bVerified = b.security && b.security.validated && b.security.score === 100 && b.security.valid;

                // Verified components come first
                if (aVerified && !bVerified) return -1;
                if (!aVerified && bVerified) return 1;

                // If both verified or both not verified, sort by downloads
                const downloadsA = a.downloads || 0;
                const downloadsB = b.downloads || 0;
                return downloadsB - downloadsA;
            });
        }

        return sortedComponents;
    }
    
    // Handle sort change from the dropdown
    handleSortChange(sortValue) {
        this.currentSort = sortValue;
        this.currentPage = 1; // Reset to first page when changing sort
        this.displayCurrentFilter();
    }

    // Collect available categories from loaded components
    collectAvailableCategories() {
        // Reset categories
        this.availableCategories.agents.clear();
        this.availableCategories.commands.clear();
        this.availableCategories.mcps.clear();
        this.availableCategories.settings.clear();
        this.availableCategories.hooks.clear();
        this.availableCategories.skills.clear();
        this.availableCategories.templates.clear();
        
        // Collect categories from each component type
        if (this.componentsData.agents && Array.isArray(this.componentsData.agents)) {
            this.componentsData.agents.forEach(component => {
                const category = component.category || 'general';
                this.availableCategories.agents.add(category);
            });
        }
        
        if (this.componentsData.commands && Array.isArray(this.componentsData.commands)) {
            this.componentsData.commands.forEach(component => {
                const category = component.category || 'general';  
                this.availableCategories.commands.add(category);
            });
        }
        
        if (this.componentsData.mcps && Array.isArray(this.componentsData.mcps)) {
            this.componentsData.mcps.forEach(component => {
                const category = component.category || 'general';
                this.availableCategories.mcps.add(category);
            });
        }
        
        if (this.componentsData.settings && Array.isArray(this.componentsData.settings)) {
            this.componentsData.settings.forEach(component => {
                const category = component.category || 'general';
                this.availableCategories.settings.add(category);
            });
        }
        
        if (this.componentsData.hooks && Array.isArray(this.componentsData.hooks)) {
            this.componentsData.hooks.forEach(component => {
                const category = component.category || 'general';
                this.availableCategories.hooks.add(category);
            });
        }

        if (this.componentsData.skills && Array.isArray(this.componentsData.skills)) {
            this.componentsData.skills.forEach(component => {
                const category = component.category || 'general';
                this.availableCategories.skills.add(category);
            });
        }

        // Collect categories from templates (use language as category for language templates)
        if (this.componentsData.templates && Array.isArray(this.componentsData.templates)) {
            this.componentsData.templates.forEach(template => {
                if (template.subtype === 'language') {
                    this.availableCategories.templates.add(template.name);
                } else if (template.subtype === 'framework' && template.language) {
                    this.availableCategories.templates.add(template.language);
                }
            });
        }
    }

    displayCurrentFilter() {
        const grid = document.getElementById('unifiedGrid');
        if (!grid) return;

        // Set proper grid class based on current filter
        if (this.currentFilter === 'templates') {
            grid.className = 'unified-grid templates-mode';
        } else {
            grid.className = 'unified-grid components-mode';
        }

        // Update filter button counts
        this.updateFilterCounts();

        switch (this.currentFilter) {
            case 'templates':
                this.displayTemplates(grid);
                break;
            case 'plugins':
                this.displayPlugins(grid);
                break;
            case 'agents':
            case 'commands':
            case 'mcps':
            case 'settings':
            case 'hooks':
            case 'skills':
                this.displayComponents(grid, this.currentFilter);
                break;
            default:
                grid.innerHTML = '<div class="error">Unknown filter</div>';
        }
    }

    displayTemplates(grid) {
        if (!this.componentsData || !this.componentsData.templates) {
            grid.innerHTML = '<div class="loading">Loading templates...</div>';
            return;
        }

        // Update category sub-filters for templates
        this.updateCategorySubFilters();

        // Clear the grid
        grid.innerHTML = '';
        
        // Add the "Add New Template" card first
        const addTemplateCard = this.createAddTemplateCard();
        grid.appendChild(addTemplateCard);
        
        // Filter templates based on category selection
        let filteredTemplates = this.componentsData.templates;
        if (this.currentCategoryFilter !== 'all') {
            filteredTemplates = this.componentsData.templates.filter(template => {
                if (template.subtype === 'language') {
                    return template.name === this.currentCategoryFilter;
                } else if (template.subtype === 'framework') {
                    return template.language === this.currentCategoryFilter;
                }
                return false;
            });
        }
        
        // Apply sorting to templates
        filteredTemplates = this.sortComponents(filteredTemplates);
        
        // Create template cards from the filtered list
        filteredTemplates.forEach(template => {
            const templateCard = this.createTemplateCardFromJSON(template);
            grid.appendChild(templateCard);
        });
    }

    displayPlugins(grid) {
        if (!this.componentsData || !this.componentsData.plugins) {
            grid.innerHTML = '<div class="loading">Loading plugins...</div>';
            return;
        }

        // Clear the grid
        grid.innerHTML = '';

        // Get plugins from loaded components data
        const plugins = this.componentsData.plugins;

        if (plugins.length === 0) {
            grid.innerHTML = '<div class="no-data">No plugins available</div>';
            return;
        }

        // Add marketplace setup notice
        const marketplaceNotice = document.createElement('div');
        marketplaceNotice.className = 'plugin-marketplace-notice';
        marketplaceNotice.innerHTML = `
            <div class="notice-icon">ℹ️</div>
            <div class="notice-content">
                <h4>First Time Setup Required</h4>
                <p>Before installing any plugin, you need to add the marketplace to Claude Code:</p>
                <div class="notice-command">
                    <code>/plugin marketplace add https://github.com/davila7/claude-code-templates</code>
                    <button class="notice-copy-btn" onclick="copyToClipboard('/plugin marketplace add https://github.com/davila7/claude-code-templates'); event.stopPropagation();" title="Copy command">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                        </svg>
                    </button>
                </div>
                <p class="notice-footer">After adding the marketplace, you can install any plugin below.</p>
            </div>
        `;
        grid.appendChild(marketplaceNotice);

        // Create plugin cards
        plugins.forEach(plugin => {
            const pluginCard = this.createPluginCard(plugin);
            grid.appendChild(pluginCard);
        });
    }

    createPluginCard(plugin) {
        const card = document.createElement('div');
        card.className = 'template-card plugin-card';

        // Count components
        const totalComponents = (plugin.commands || 0) + (plugin.agents || 0) + (plugin.mcpServers || 0);

        card.innerHTML = `
            <div class="card-inner">
                <div class="card-front">
                    <div class="plugin-content-wrapper">
                        <div class="plugin-version">v${plugin.version}</div>
                        <div class="framework-logo" style="color: #a855f7">
                            <span class="component-icon">🧩</span>
                        </div>
                        <h3 class="template-title">${this.formatComponentName(plugin.name)}</h3>
                        <p class="template-description">${plugin.description}</p>
                        <div class="plugin-stats">
                            ${plugin.commands > 0 ? `<span class="plugin-stat"><span class="stat-icon">⚡</span>${plugin.commands}</span>` : ''}
                            ${plugin.agents > 0 ? `<span class="plugin-stat"><span class="stat-icon">🤖</span>${plugin.agents}</span>` : ''}
                            ${plugin.mcpServers > 0 ? `<span class="plugin-stat"><span class="stat-icon">🔌</span>${plugin.mcpServers}</span>` : ''}
                        </div>
                    </div>
                    <button class="plugin-view-details-btn" onclick="window.location.href='/plugin/${plugin.name}'; event.stopPropagation();">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M14,3V5H17.59L7.76,14.83L9.17,16.24L19,6.41V10H21V3M19,19H5V5H12V3H5C3.89,3 3,3.9 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V12H19V19Z"/>
                        </svg>
                        View Details
                    </button>
                </div>
                <div class="card-back">
                    <div class="command-display">
                        <h3>Installation Command</h3>
                        <div class="command-code-container">
                            <div class="command-code">${plugin.installCommand}</div>
                            <button class="copy-overlay-btn" onclick="copyToClipboard('${plugin.installCommand.replace(/'/g, "\\'")}'); event.stopPropagation();" title="Copy command">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                                </svg>
                                Copy Command
                            </button>
                        </div>
                        <div class="plugin-components-list">
                            <h4>Included Components (${totalComponents})</h4>
                            ${plugin.commands > 0 ? `<div class="component-type-item">⚡ ${plugin.commands} Command${plugin.commands > 1 ? 's' : ''}</div>` : ''}
                            ${plugin.agents > 0 ? `<div class="component-type-item">🤖 ${plugin.agents} Agent${plugin.agents > 1 ? 's' : ''}</div>` : ''}
                            ${plugin.mcpServers > 0 ? `<div class="component-type-item">🔌 ${plugin.mcpServers} MCP${plugin.mcpServers > 1 ? 's' : ''}</div>` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;

        return card;
    }

    displayComponents(grid, type) {
        if (!this.componentsData) {
            grid.innerHTML = '<div class="loading">Loading components...</div>';
            return;
        }

        // Update category sub-filters in the unified-filter-bar
        this.updateCategorySubFilters();
        
        const allComponents = this.getFilteredComponents(type);
        
        // Calculate pagination
        const totalItems = allComponents.length + 1; // +1 for "Add New" card
        this.totalPages = Math.ceil(totalItems / this.itemsPerPage);
        
        // Get components for current page
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        
        let html = '';
        let itemsToShow = [];
        
        // Add "Add New" card to the beginning
        itemsToShow.push({ type: 'add-new', data: type });
        
        // Add components
        allComponents.forEach(component => {
            itemsToShow.push({ type: 'component', data: component });
        });
        
        // Get items for current page
        const pageItems = itemsToShow.slice(startIndex, endIndex);
        
        // Generate HTML for page items
        pageItems.forEach(item => {
            if (item.type === 'add-new') {
                html += this.createAddComponentCard(item.data);
            } else {
                html += this.generateComponentCard(item.data);
            }
        });
        
        // Create pagination controls
        const paginationHTML = this.createPaginationControls();
        
        grid.innerHTML = html || '<div class="no-data">No components available</div>';
        
        // Add pagination after the grid
        this.updatePagination(paginationHTML);
    }


    generateComponentCard(component) {
        // Generate install command - remove .md extension from path
        let componentPath = component.path || component.name;
        // Remove .md or .json extensions from path
        if (componentPath.endsWith('.md') || componentPath.endsWith('.json')) {
            componentPath = componentPath.replace(/\.(md|json)$/, '');
        }
        if (componentPath.endsWith('.json')) {
            componentPath = componentPath.replace(/\.json$/, '');
        }
        const installCommand = `npx claude-code-templates@latest --${component.type}=${componentPath} --yes`;
        
        const typeConfig = {
            agent: { icon: '🤖', color: '#ff6b6b' },
            command: { icon: '⚡', color: '#4ecdc4' },
            mcp: { icon: '🔌', color: '#45b7d1' },
            setting: { icon: '⚙️', color: '#9c88ff' },
            hook: { icon: '🪝', color: '#ff8c42' },
            skill: { icon: '🎨', color: '#f59e0b' }
        };
        
        const config = typeConfig[component.type];
        
        // Escape quotes and special characters for onclick attributes
        const escapedType = component.type.replace(/'/g, "\\'");
        const escapedName = (component.name || '').replace(/'/g, "\\'");
        const escapedPath = (component.path || component.name || '').replace(/'/g, "\\'");
        const escapedCategory = (component.category || 'general').replace(/'/g, "\\'");
        const escapedCommand = installCommand.replace(/'/g, "\\'");
        
        // Create category label (use "General" if no category)
        const categoryName = component.category || 'general';
        const categoryLabel = `<div class="category-label">${this.formatComponentName(categoryName)}</div>`;
        
        // Create download badge if downloads data exists
        const downloadBadge = component.downloads && component.downloads > 0 ?
            `<div class="download-badge" title="${component.downloads} downloads">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M5 20h14v-2H5v2zM19 9h-4V3H9v6H5l7 7 7-7z"/>
                </svg>
                ${this.formatNumber(component.downloads)}
            </div>` : '';

        // Create validation badge for agents with security data
        const validationBadge = this.createValidationBadge(component.security);

        return `
            <div class="template-card" data-type="${component.type}">
                <div class="card-inner">
                    <div class="card-front">
                        ${downloadBadge}
                        ${categoryLabel}
                        <div class="framework-logo" style="color: ${config.color}">
                            <span class="component-icon">${config.icon}</span>
                            ${validationBadge}
                        </div>
                        <h3 class="template-title">${this.formatComponentName(component.name)}</h3>
                        ${component.type === 'mcp' ? 
                            `<p class="template-description">${this.truncateDescription(component.description || 'MCP integration for enhanced development workflow', 80)}</p>` : 
                            `<p class="template-description">${this.getComponentDescription(component)}</p>`
                        }
                    </div>
                    <div class="card-back">
                        <div class="command-display">
                            <h3>Installation Command</h3>
                            <div class="command-code-container">
                                <div class="command-code">${installCommand}</div>
                                <button class="copy-overlay-btn" onclick="copyToClipboard('${escapedCommand}'); event.stopPropagation();" title="Copy command">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                                    </svg>
                                    Copy Command
                                </button>
                            </div>
                            <div class="card-actions">
                                <button class="view-files-btn" onclick="showComponentDetails('${escapedType}', '${escapedName}', '${escapedPath}', '${escapedCategory}')">
                                    📁 View Details
                                </button>
                                <button class="add-to-cart-btn" 
                                        data-type="${component.type}s" 
                                        data-path="${componentPath}"
                                        onclick="handleAddToCart('${escapedName}', '${componentPath}', '${component.type}s', '${escapedCategory}', this)">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M19,7H18V6A2,2 0 0,0 16,4H8A2,2 0 0,0 6,6V7H5A1,1 0 0,0 4,8A1,1 0 0,0 5,9H6V19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V9H19A1,1 0 0,0 20,8A1,1 0 0,0 19,7M8,6H16V7H8V6M16,19H8V9H16V19Z"/>
                                    </svg>
                                    Add to Stack
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    copyToClipboard(text) {
        // Use the global function from utils.js
        if (typeof window.copyToClipboard === 'function') {
            window.copyToClipboard(text);
        } else {
            copyToClipboard(text);
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.textContent = message;
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            padding: 12px 24px;
            border-radius: 6px;
            z-index: 10000;
            font-family: system-ui, -apple-system, sans-serif;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }

    formatComponentName(name) {
        return name.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    }

    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    truncateDescription(description, maxLength = 80) {
        if (!description) return '';
        if (description.length <= maxLength) return description;
        return description.substring(0, maxLength).trim() + '...';
    }

    getComponentDescription(component) {
        let description = '';

        if (component.description) {
            description = component.description;
        } else if (component.content) {
            // Try to extract description from frontmatter
            const descMatch = component.content.match(/description:\s*(.+?)(?:\n|$)/);
            if (descMatch) {
                description = descMatch[1].trim().replace(/^["']|["']$/g, '');
            } else {
                // Use first paragraph if no frontmatter description
                const lines = component.content.split('\n');
                const firstParagraph = lines.find(line => line.trim() && !line.startsWith('---') && !line.startsWith('#'));
                if (firstParagraph) {
                    description = firstParagraph.trim();
                }
            }
        }

        if (!description) {
            description = `A ${component.type} component for Claude Code.`;
        }

        // Truncate description to max 120 characters for proper card display
        if (description.length > 120) {
            description = description.substring(0, 117) + '...';
        }

        return description;
    }

    /**
     * Create validation badge HTML - Only for perfect 100% score
     */
    createValidationBadge(validation) {
        if (!validation || !validation.validated) return '';

        const score = validation.score || 0;
        const isValid = validation.valid;

        // ONLY show badge for perfect score (100%)
        if (score === 100 && isValid) {
            return `<div class="verified-checkmark" title="100% Validated - Perfect Security Score">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#1DA1F2">
                    <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z"/>
                </svg>
            </div>`;
        }

        // Don't show anything for scores below 100
        return '';
    }

    // Update filter button counts
    updateFilterCounts() {
        // Get accurate total counts from data loader (includes full data counts)
        const totalCounts = window.dataLoader.getTotalCounts();
        if (!totalCounts) return;

        // Update each filter button with accurate total count
        const agentsBtn = document.querySelector('[data-filter="agents"]');
        const commandsBtn = document.querySelector('[data-filter="commands"]');
        const mcpsBtn = document.querySelector('[data-filter="mcps"]');
        const settingsBtn = document.querySelector('[data-filter="settings"]');
        const hooksBtn = document.querySelector('[data-filter="hooks"]');
        const skillsBtn = document.querySelector('[data-filter="skills"]');
        const templatesBtn = document.querySelector('[data-filter="templates"]');

        if (agentsBtn) {
            agentsBtn.innerHTML = `<span class="chip-icon">🤖</span>agents (${totalCounts.agents})`;
        }
        if (commandsBtn) {
            commandsBtn.innerHTML = `<span class="chip-icon">⚡</span>commands (${totalCounts.commands})`;
        }
        if (mcpsBtn) {
            mcpsBtn.innerHTML = `<span class="chip-icon">🔌</span>mcps (${totalCounts.mcps})`;
        }
        if (settingsBtn) {
            settingsBtn.innerHTML = `<span class="chip-icon">⚙️</span>settings (${totalCounts.settings})`;
        }
        if (hooksBtn) {
            hooksBtn.innerHTML = `<span class="chip-icon">🪝</span>hooks (${totalCounts.hooks})`;
        }
        if (skillsBtn) {
            skillsBtn.innerHTML = `<span class="new-label">NEW</span><span class="chip-icon">🎨</span>skills (${totalCounts.skills})`;
        }
        if (templatesBtn) {
            templatesBtn.innerHTML = `<span class="chip-icon">📦</span>templates (${totalCounts.templates})`;
        }
    }

    // Create Add Component card
    createAddComponentCard(type) {
        const typeConfig = {
            agents: {
                icon: '🤖',
                name: 'Agent',
                description: 'Create a new AI specialist agent',
                color: '#ff6b6b'
            },
            commands: {
                icon: '⚡',
                name: 'Command',
                description: 'Add a custom slash command',
                color: '#4ecdc4'
            },
            mcps: {
                icon: '🔌',
                name: 'MCP',
                description: 'Build a Model Context Protocol integration',
                color: '#45b7d1'
            },
            settings: {
                icon: '⚙️',
                name: 'Setting',
                description: 'Configure Claude Code behavior',
                color: '#9c88ff'
            },
            hooks: {
                icon: '🪝',
                name: 'Hook',
                description: 'Automate tool execution workflows',
                color: '#ff8c42'
            },
            skills: {
                icon: '🎨',
                name: 'Skill',
                description: 'Add modular capabilities with progressive disclosure',
                color: '#f59e0b'
            }
        };
        
        const config = typeConfig[type];
        if (!config) return '';
        
        return `
            <div class="template-card add-template-card add-component-card" onclick="showComponentContributeModal('${type}')">
                <div class="card-inner">
                    <div class="card-front">
                        <div class="framework-logo" style="color: ${config.color}">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
                            </svg>
                        </div>
                        <h3 class="template-title">Add New ${config.name}</h3>
                        <p class="template-description">${config.description}</p>
                    </div>
                </div>
            </div>
        `;
    }

    showError(message) {
        const grid = document.getElementById('unifiedGrid');
        if (grid) {
            grid.innerHTML = `
                <div class="error-message">
                    <h3>Error</h3>
                    <p>${message}</p>
                    <button onclick="location.reload()" class="btn-primary">Retry</button>
                </div>
            `;
        }
    }

    // Get framework icon from mapping
    getFrameworkIcon(framework) {
        return this.FRAMEWORK_ICONS[framework] || this.FRAMEWORK_ICONS['default'];
    }

    // Create Add Template card
    createAddTemplateCard() {
        const card = document.createElement('div');
        card.className = 'template-card add-template-card';
        
        card.innerHTML = `
            <div class="card-inner">
                <div class="card-front">
                    <div class="framework-logo">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
                        </svg>
                    </div>
                    <h3 class="template-title">Add New Template</h3>
                    <p class="template-description">Contribute a new language or framework to the community</p>
                </div>
            </div>
        `;
        
        // Add click handler
        card.addEventListener('click', () => {
            showComponentContributeModal('templates');
        });
        
        return card;
    }

    // Create template card from JSON structure
    createTemplateCardFromJSON(template) {
        const card = document.createElement('div');
        card.className = 'template-card';
        
        // Determine the icon based on template name/type
        const icon = this.getFrameworkIcon(template.name);
        
        // Create the display name
        const displayName = template.subtype === 'framework' 
            ? `${template.language}/${template.name}`
            : template.name;
            
        card.innerHTML = `
            <div class="card-inner">
                <div class="card-front">
                    <div class="framework-logo">
                        <i class="${icon} colored"></i>
                    </div>
                    <h3 class="template-title">${displayName}</h3>
                    <p class="template-description">${template.description}</p>
                </div>
                <div class="card-back">
                    <div class="command-display">
                        <h3>Installation Command</h3>
                        <div class="command-code">${template.installCommand}</div>
                        <div class="action-buttons">
                            <button class="view-files-btn" onclick="showTemplateDetails('${template.id}', '${template.name}', '${template.subtype}')">
                                📁 View Files
                            </button>
                            <button class="copy-command-btn" onclick="copyToClipboard('${template.installCommand}')">
                                📋 Copy Command
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Card flip is handled by global event listener in setupEventListeners
        
        return card;
    }

    // Create individual template card (legacy method, keep for compatibility)
    createTemplateCard(languageKey, languageData, frameworkKey, frameworkData) {
        const card = document.createElement('div');
        card.className = `template-card ${languageData.comingSoon ? 'coming-soon' : ''}`;
        
        const displayName = frameworkKey === 'none' ? 
            frameworkData.name : 
            `${languageData.name.split('/')[0]}/${frameworkData.name}`;
        
        card.innerHTML = `
            <div class="card-inner">
                <div class="card-front">
                    ${languageData.comingSoon ? '<div class="coming-soon-badge">Coming Soon</div>' : ''}
                    <div class="framework-logo">
                        <i class="${frameworkData.icon} colored"></i>
                    </div>
                    <h3 class="template-title">${displayName}</h3>
                    <p class="template-description">${(languageData.description || '').substring(0, 120)}${(languageData.description || '').length > 120 ? '...' : ''}</p>
                </div>
                <div class="card-back">
                    <div class="command-display">
                        <h3>Installation Options</h3>
                        <div class="command-code">${frameworkData.command}</div>
                        <div class="action-buttons">
                            <button class="view-files-btn" onclick="showInstallationFiles('${languageKey}', '${frameworkKey}', '${displayName}')">
                                📁 View Files
                            </button>
                            <button class="copy-command-btn" onclick="copyToClipboard('${frameworkData.command}')">
                                📋 Copy Command
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Add click handler for card flip (only if not coming soon)
        if (!languageData.comingSoon) {
            card.addEventListener('click', (e) => {
                // Don't flip if clicking on buttons
                if (!e.target.closest('button')) {
                    card.classList.toggle('flipped');
                }
            });
        }
        
        return card;
    }

    // Fetch templates configuration from GitHub
    async fetchTemplatesConfig() {
        const GITHUB_CONFIG = {
            owner: 'davila7',
            repo: 'claude-code-templates',
            branch: 'main',
            templatesPath: 'cli-tool/src/templates.js'
        };
        
        try {
            const url = `https://raw.githubusercontent.com/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/${GITHUB_CONFIG.branch}/${GITHUB_CONFIG.templatesPath}?t=${Date.now()}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const templateFileContent = await response.text();
            this.templatesData = this.parseTemplatesConfig(templateFileContent);
            
            return this.templatesData;
        } catch (error) {
            console.error('Error fetching templates:', error);
            throw error;
        }
    }

    // Parse templates configuration
    parseTemplatesConfig(fileContent) {
        try {
            const configMatch = fileContent.match(/const TEMPLATES_CONFIG = ({[\s\S]*?});/);
            if (!configMatch) {
                throw new Error('TEMPLATES_CONFIG not found in file');
            }
            
            let configString = configMatch[1];
            configString = configString.replace(/'/g, '"');
            configString = configString.replace(/(\w+):/g, '"$1":');
            configString = configString.replace(/,(\s*[}\]])/g, '$1');
            
            return JSON.parse(configString);
        } catch (error) {
            console.error('Error parsing templates config:', error);
            return null;
        }
    }

    // Show contribute modal
    showContributeModal() {
        alert('Contribute modal would open here - this needs to be implemented with the full modal HTML from script.js');
    }
    
    // Create pagination controls
    createPaginationControls() {
        if (this.totalPages <= 1) return '';
        
        let paginationHTML = '<div class="pagination-container">';
        paginationHTML += '<div class="pagination">';
        
        // Previous button
        const prevDisabled = this.currentPage === 1 ? 'disabled' : '';
        paginationHTML += `<button class="pagination-btn prev-btn ${prevDisabled}" onclick="goToPage(${this.currentPage - 1})" ${prevDisabled ? 'disabled' : ''}>`;
        paginationHTML += '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>';
        paginationHTML += '</button>';
        
        // Page numbers
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(this.totalPages, this.currentPage + 2);
        
        if (startPage > 1) {
            paginationHTML += `<button class="pagination-btn page-btn" onclick="goToPage(1)">1</button>`;
            if (startPage > 2) {
                paginationHTML += '<span class="pagination-dots">...</span>';
            }
        }
        
        for (let i = startPage; i <= endPage; i++) {
            const activeClass = i === this.currentPage ? 'active' : '';
            paginationHTML += `<button class="pagination-btn page-btn ${activeClass}" onclick="goToPage(${i})">${i}</button>`;
        }
        
        if (endPage < this.totalPages) {
            if (endPage < this.totalPages - 1) {
                paginationHTML += '<span class="pagination-dots">...</span>';
            }
            paginationHTML += `<button class="pagination-btn page-btn" onclick="goToPage(${this.totalPages})">${this.totalPages}</button>`;
        }
        
        // Next button
        const nextDisabled = this.currentPage === this.totalPages ? 'disabled' : '';
        paginationHTML += `<button class="pagination-btn next-btn ${nextDisabled}" onclick="goToPage(${this.currentPage + 1})" ${nextDisabled ? 'disabled' : ''}>`;
        paginationHTML += '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M10.02 6L8.61 7.41 13.19 12l-4.58 4.59L10.02 18l6-6z"/></svg>';
        paginationHTML += '</button>';
        
        paginationHTML += '</div>';
        paginationHTML += `<div class="pagination-info">Page ${this.currentPage} of ${this.totalPages}</div>`;
        paginationHTML += '</div>';
        
        return paginationHTML;
    }
    
    // Navigate to specific page
    goToPage(page) {
        if (page < 1 || page > this.totalPages || page === this.currentPage) return;
        
        this.currentPage = page;
        this.displayCurrentFilter();
        
        // Scroll to top of content grid
        const contentGrid = document.getElementById('contentGrid');
        if (contentGrid) {
            contentGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
    
    // Update pagination controls
    updatePagination(paginationHTML) {
        // Remove any existing pagination containers from the entire document
        const existingPaginations = document.querySelectorAll('.pagination-container');
        existingPaginations.forEach(pagination => pagination.remove());
        
        // Add new pagination if needed
        if (this.totalPages > 1 && paginationHTML) {
            const contentGrid = document.getElementById('contentGrid');
            if (contentGrid) {
                contentGrid.insertAdjacentHTML('afterend', paginationHTML);
            }
        }
    }
}

// Global function for component details is now handled by modal-helpers.js

// Global function for copying is now handled by utils.js

// Global function for handling sort change (called from onchange)
function handleSortChange(sortValue) {
    if (window.indexManager) {
        window.indexManager.handleSortChange(sortValue);
    }
}

// Global function for handling filter click with navigation
function handleFilterClick(event, filter) {
    event.preventDefault(); // Prevent default link navigation

    // If plugins filter, scroll to plugins section
    if (filter === 'plugins') {
        const contentGrid = document.getElementById('contentGrid');
        if (contentGrid) {
            contentGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    setUnifiedFilter(filter);
}

// Global function for setting filter (called from onclick)
function setUnifiedFilter(filter) {
    if (window.indexManager) {
        window.indexManager.setFilter(filter);
    }
    
    // Update filter buttons - remove active from ALL filter buttons
    document.querySelectorAll('.component-type-filters .filter-chip').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Add active class only to the clicked filter button
    const activeBtn = document.querySelector(`.component-type-filters [data-filter="${filter}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
    
    console.log('Component type filter selected:', filter);
    
    // Update URL with filter parameter
    if (typeof updateURLWithFilter === 'function') {
        updateURLWithFilter(filter);
    }
    
    // Show category filters for the selected component type
    showCategoryFilters(filter);
}

// Function to show category filters based on component type
function showCategoryFilters(componentType) {
    const categoryContainer = document.getElementById('componentCategories');
    const categoryChips = document.getElementById('categoryChips');
    
    if (!categoryContainer || !categoryChips) return;
    
    // Get categories from actual component data
    let categories = [];
    
    if (window.dataLoader) {
        const dataLoader = window.dataLoader;
        
        console.log('DataLoader available, getting categories for:', componentType);
        console.log('DataLoader componentsData:', dataLoader.componentsData);
        
        switch(componentType) {
            case 'agents':
                const agents = dataLoader.getComponentsByType('agent');
                console.log('Agents data:', agents);
                categories = getUniqueCategories(agents);
                break;
            case 'commands':
                const commands = dataLoader.getComponentsByType('command');
                console.log('Commands data:', commands);
                categories = getUniqueCategories(commands);
                break;
            case 'settings':
                try {
                    categories = dataLoader.getSettingCategories ? dataLoader.getSettingCategories() : getUniqueCategories(dataLoader.getSettings());
                } catch (e) {
                    const settings = dataLoader.getComponentsByType('setting') || dataLoader.getSettings();
                    categories = getUniqueCategories(settings);
                }
                break;
            case 'hooks':
                try {
                    categories = dataLoader.getHookCategories ? dataLoader.getHookCategories() : getUniqueCategories(dataLoader.getHooks());
                } catch (e) {
                    const hooks = dataLoader.getComponentsByType('hook') || dataLoader.getHooks();
                    categories = getUniqueCategories(hooks);
                }
                break;
            case 'mcps':
                const mcps = dataLoader.getComponentsByType('mcp');
                console.log('MCPs data:', mcps);
                categories = getUniqueCategories(mcps);
                break;
            case 'skills':
                const skills = dataLoader.getComponentsByType('skill');
                console.log('Skills data:', skills);
                categories = getUniqueCategories(skills);
                break;
            case 'templates':
                const templates = dataLoader.getComponentsByType('template');
                console.log('Templates data:', templates);
                categories = getUniqueCategories(templates);
                break;
            case 'plugins':
                // Plugins don't have categories
                categories = [];
                break;
            default:
                categories = [];
        }
        
        console.log('Found categories for', componentType, ':', categories);
    } else {
        console.log('DataLoader not available yet');
    }
    
    // Add "All" option at the beginning
    if (categories.length > 0) {
        categories.unshift('All');
    }
    
    if (categories.length > 0) {
        categoryChips.innerHTML = categories.map((category, index) => {
            const displayName = formatCategoryName(category);
            // Only the first item (All) should be active by default
            const isActive = index === 0 ? 'active' : '';
            return `
                <button class="filter-chip ${isActive}" data-category="${category.toLowerCase()}" onclick="setCategoryFilter('${category.toLowerCase()}')">
                    ${displayName}
                </button>
            `;
        }).join('');
        
        categoryContainer.style.display = 'block';
    } else {
        categoryContainer.style.display = 'none';
    }
}

// Helper function to extract unique categories from component data
function getUniqueCategories(components) {
    if (!components || !Array.isArray(components)) return [];
    
    const categories = new Set();
    components.forEach(component => {
        if (component.category && component.category.trim() !== '') {
            categories.add(component.category);
        }
    });
    
    return Array.from(categories).sort();
}

// Helper function to format category names for display
function formatCategoryName(category) {
    if (category === 'All') return 'All';
    
    // Convert category names to proper case
    return category
        .split(/[-_\s]+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

// Function to handle category filter selection
// Enhanced setCategoryFilter function that handles both old and new category systems
window.setCategoryFilter = function setCategoryFilter(category) {
    console.log('setCategoryFilter called with:', category);
    
    // Handle the new category chips in #categoryChips
    const categoryButtons = document.querySelectorAll('#categoryChips button.filter-chip');
    if (categoryButtons.length > 0) {
        console.log('Found new category buttons:', categoryButtons.length);
        
        categoryButtons.forEach((btn, index) => {
            console.log(`Button ${index}:`, btn.getAttribute('data-category'), 'has active:', btn.classList.contains('active'));
            btn.classList.remove('active');
        });
        
        // Add active class only to the clicked button
        const activeBtn = document.querySelector(`#categoryChips button[data-category="${category}"]`);
        console.log('Target button found:', activeBtn);
        
        if (activeBtn) {
            activeBtn.classList.add('active');
            console.log('Added active class to:', category);
        }
    }
    
    // Also call the existing IndexManager setCategoryFilter method for actual filtering
    if (window.indexManager && window.indexManager.setCategoryFilter) {
        console.log('Calling IndexManager setCategoryFilter with:', category);
        window.indexManager.setCategoryFilter(category);
    }
    
    // Force re-render of the current filter to apply category filtering
    if (window.indexManager && window.indexManager.displayCurrentFilter) {
        console.log('Re-displaying current filter to apply category filter');
        window.indexManager.displayCurrentFilter();
    }
}

// Test function to debug category filters
window.testCategoryFilter = function() {
    console.log('=== Category Filter Debug ===');
    const categoryChips = document.getElementById('categoryChips');
    console.log('Category chips container:', categoryChips);
    
    if (categoryChips) {
        const buttons = categoryChips.querySelectorAll('button.filter-chip');
        console.log('Found buttons:', buttons.length);
        
        buttons.forEach((btn, index) => {
            console.log(`Button ${index}:`, {
                category: btn.getAttribute('data-category'),
                hasActive: btn.classList.contains('active'),
                onclick: btn.getAttribute('onclick')
            });
        });
    }
    
    console.log('setCategoryFilter function exists:', typeof window.setCategoryFilter);
}

// Global helper functions for template cards
function showInstallationFiles(languageKey, frameworkKey, displayName) {
    console.log('Show installation files for:', displayName);
    // For now, just show a simple alert - could be enhanced later with full modal
    alert(`Installation files for ${displayName} would be shown here.`);
}

// Global function for template details
function showTemplateDetails(templateId, templateName, subtype) {
    if (!window.indexManager || !window.indexManager.componentsData) {
        console.error('IndexManager or components data not available');
        return;
    }
    
    // Find the template in the data
    const template = window.indexManager.componentsData.templates.find(t => t.id === templateId);
    if (!template) {
        console.error('Template not found:', templateId);
        return;
    }
    
    // Create modal to show template files
    const modalHTML = `
        <div class="modal-overlay" onclick="closeComponentModal()">
            <div class="modal-content component-modal" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <div class="component-modal-title">
                        <span class="component-icon">📦</span>
                        <h3>${templateName} Template</h3>
                    </div>
                    <div class="component-type-badge" style="background-color: #f9a825;">TEMPLATE</div>
                    <button class="modal-close" onclick="closeComponentModal()">×</button>
                </div>
                <div class="modal-body">
                    <div class="component-details">
                        <div class="component-description">
                            ${template.description}
                        </div>
                        
                        <div class="installation-section">
                            <h4>📦 Installation</h4>
                            <div class="command-line">
                                <code>${template.installCommand}</code>
                                <button class="copy-btn" onclick="copyToClipboard('${template.installCommand}')">Copy</button>
                            </div>
                        </div>

                        <div class="component-content">
                            <h4>📁 Template Files (${template.files ? template.files.length : 0} files)</h4>
                            ${template.files && template.files.length > 0 ? `
                                <div class="template-files-list">
                                    ${template.files.map(file => `
                                        <div class="template-file-item">
                                            <span class="file-icon">📄</span>
                                            <span class="file-name">${file}</span>
                                        </div>
                                    `).join('')}
                                </div>
                            ` : '<p>No files listed for this template.</p>'}
                        </div>
                    </div>
                </div>
                <div class="modal-actions">
                    <a href="https://github.com/davila7/claude-code-templates/tree/main/cli-tool/templates/${subtype === 'framework' ? `${template.language}/examples/${templateName}` : templateName}" target="_blank" class="github-folder-link">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.30.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                        </svg>
                        View on GitHub
                    </a>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if present
    const existingModal = document.querySelector('.modal-overlay');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// Global function for setting category filter (called from onclick)
// setCategoryFilter function is now defined globally above as window.setCategoryFilter

// Show component contribute modal (copied from script.js)
function showComponentContributeModal(type) {
    const typeConfig = {
        agents: { 
            name: 'Agent', 
            description: 'AI specialist that handles specific development tasks',
            example: 'python-testing-specialist',
            structure: '- Agent metadata (name, description, color)\n- Core expertise areas\n- When to use guidelines\n- Code examples and patterns'
        },
        commands: { 
            name: 'Command', 
            description: 'Custom slash command for Claude Code',
            example: 'optimize-bundle',
            structure: '- Command description and usage\n- Task breakdown\n- Process steps\n- Best practices and examples'
        },
        mcps: { 
            name: 'MCP', 
            description: 'Model Context Protocol integration',
            example: 'redis-integration',
            structure: '- MCP server configuration\n- Connection parameters\n- Environment variables\n- Usage examples'
        },
        settings: { 
            name: 'Setting', 
            description: 'Claude Code configuration setting',
            example: 'custom-model-config',
            structure: '- Setting description\n- Configuration options\n- Environment variables\n- Usage examples and best practices'
        },
        hooks: { 
            name: 'Hook', 
            description: 'Automation hook for tool execution',
            example: 'format-on-save',
            structure: '- Hook description and trigger\n- Command to execute\n- PreToolUse or PostToolUse configuration\n- Error handling and examples'
        },
        templates: {
            name: 'Template',
            description: 'Project template with language or framework setup',
            example: 'python or django-app',
            structure: 'For Languages: Create folder with base files\nFor Frameworks: Add to examples/ subfolder with specific setup'
        },
        skills: {
            name: 'Skill',
            description: 'Interactive skill for specialized tasks',
            example: 'data-visualization-skill',
            structure: '- Skill description and purpose\n- Interactive prompts and parameters\n- Input/output specifications\n- Usage examples and best practices'
        }
    };

    const config = typeConfig[type];
    
    let modalHTML = '';
    
    if (type === 'templates') {
        // Special modal for templates
        modalHTML = `
            <div class="modal-overlay" onclick="closeComponentModal()">
                <div class="modal-content contribute-modal" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h3>📦 Contribute a New Template</h3>
                        <button class="modal-close" onclick="closeComponentModal()">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="contribute-intro">
                            <p>Help expand Claude Code by contributing a new project template! Choose between contributing a new <strong>Language</strong> or a <strong>Framework</strong>:</p>
                        </div>
                        
                        <div class="template-types">
                            <div class="template-type-section">
                                <h3>🏗️ Contributing a New Language</h3>
                                <p>Add support for a completely new programming language (e.g., Kotlin, PHP, Swift)</p>
                                
                                <div class="contribute-steps">
                                    <div class="contribute-step">
                                        <div class="step-number-contrib">1</div>
                                        <div class="step-content-contrib">
                                            <h4>Create Language Folder</h4>
                                            <p>Create a new folder in <code>cli-tool/templates/</code> with your language name:</p>
                                            <div class="step-command">
                                                <code>mkdir cli-tool/templates/kotlin</code>
                                                <button class="copy-btn" onclick="copyToClipboard('mkdir cli-tool/templates/kotlin')">Copy</button>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="contribute-step">
                                        <div class="step-number-contrib">2</div>
                                        <div class="step-content-contrib">
                                            <h4>Add Base Files</h4>
                                            <p>Add the essential files for your language. <strong>Required Claude Code files:</strong></p>
                                            <div class="claude-files-info">
                                                <ul>
                                                    <li><code>CLAUDE.md</code> - Project documentation and Claude Code instructions</li>
                                                    <li><code>.mcp.json</code> - MCP server configuration if needed</li>
                                                    <li><code>.claude/</code> - Claude Code configuration folder with agents, commands, and settings</li>
                                                </ul>
                                            </div>
                                            <div class="component-structure">
                                                <strong>Required structure:</strong>
                                                <pre>cli-tool/templates/kotlin/
├── CLAUDE.md           # Claude Code configuration
├── .mcp.json          # MCP server configuration
└── .claude/           # Claude Code settings
    ├── agents/        # Language-specific agents
    ├── commands/      # Language-specific commands
    └── settings.json  # Claude settings
                                        </pre>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="contribute-step">
                                        <div class="step-number-contrib">3</div>
                                        <div class="step-content-contrib">
                                            <h4>Create Examples Folder (Optional)</h4>
                                            <p>If your language has popular frameworks, create an examples folder:</p>
                                            <div class="step-command">
                                                <code>mkdir cli-tool/templates/kotlin/examples</code>
                                                <button class="copy-btn" onclick="copyToClipboard('mkdir cli-tool/templates/kotlin/examples')">Copy</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="template-type-section">
                                <h3>⚡ Contributing a Framework</h3>
                                <p>Add a framework variation to an existing language (e.g., Spring Boot for Java)</p>
                                
                                <div class="contribute-steps">
                                    <div class="contribute-step">
                                        <div class="step-number-contrib">1</div>
                                        <div class="step-content-contrib">
                                            <h4>Choose Existing Language</h4>
                                            <p>Navigate to an existing language's examples folder:</p>
                                            <div class="step-command">
                                                <code>cd cli-tool/templates/javascript-typescript/examples</code>
                                                <button class="copy-btn" onclick="copyToClipboard('cd cli-tool/templates/javascript-typescript/examples')">Copy</button>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="contribute-step">
                                        <div class="step-number-contrib">2</div>
                                        <div class="step-content-contrib">
                                            <h4>Create Framework Folder</h4>
                                            <p>Create a folder with your framework name:</p>
                                            <div class="step-command">
                                                <code>mkdir nextjs-app</code>
                                                <button class="copy-btn" onclick="copyToClipboard('mkdir nextjs-app')">Copy</button>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="contribute-step">
                                        <div class="step-number-contrib">3</div>
                                        <div class="step-content-contrib">
                                            <h4>Add Framework Files</h4>
                                            <p>Add all necessary files for your framework setup. <strong>Required Claude Code files:</strong></p>
                                            <div class="claude-files-info">
                                                <ul>
                                                    <li><code>CLAUDE.md</code> - Framework documentation and Claude Code instructions</li>
                                                    <li><code>.mcp.json</code> - MCP server configuration for framework-specific tools</li>
                                                    <li><code>.claude/</code> - Claude Code configuration folder with framework-specific agents and commands</li>
                                                </ul>
                                            </div>
                                            <div class="component-structure">
                                                <strong>Required structure:</strong>
                                                <pre>nextjs-app/
├── CLAUDE.md           # Claude Code configuration
├── .mcp.json          # MCP server configuration
└── .claude/           # Claude Code settings
    ├── agents/        # Framework-specific agents
    ├── commands/      # Framework-specific commands
    └── settings.json  # Claude settings
                                        </pre>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="contribute-step">
                            <div class="step-number-contrib">4</div>
                            <div class="step-content-contrib">
                                <h4>Test Your Template</h4>
                                <p>Test your template installation:</p>
                                <div class="step-command">
                                    <code>npx claude-code-templates@latest --template=your-template-name --yes</code>
                                    <button class="copy-btn" onclick="copyToClipboard('npx claude-code-templates@latest --template=your-template-name --yes')">Copy</button>
                                </div>
                            </div>
                        </div>
                        
                        <div class="contribute-step">
                            <div class="step-number-contrib">5</div>
                            <div class="step-content-contrib">
                                <h4>Submit Pull Request</h4>
                                <p>Submit your template contribution (replace with your actual language/framework folder):</p>
                                <div class="step-command">
                                    <code>git add cli-tool/templates/&lt;your-language&gt;/</code>
                                    <button class="copy-btn" onclick="copyToClipboard('git add cli-tool/templates/<your-language>/')">Copy</button>
                                </div>
                                <div class="step-command">
                                    <code>git commit -m "feat: Add [language/framework] template"</code>
                                    <button class="copy-btn" onclick="copyToClipboard('git commit -m \\"feat: Add [language/framework] template\\"')">Copy</button>
                                </div>
                            </div>
                        </div>
                        
                        <div class="contribute-footer">
                            <div class="help-section">
                                <h4>Need Help?</h4>
                                <p>Check <a href="https://github.com/davila7/claude-code-templates/tree/main/cli-tool/templates" target="_blank">existing templates</a> for examples or open an issue on GitHub for guidance.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    } else {
        // Default modal for other component types
        modalHTML = `
            <div class="modal-overlay" onclick="closeComponentModal()">
                <div class="modal-content contribute-modal" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h3>📝 Contribute a New ${config.name}</h3>
                        <button class="modal-close" onclick="closeComponentModal()">×</button>
                    </div>
                    <div class="modal-body">
                        <div class="contribute-intro">
                            <p>Help expand Claude Code by contributing a new ${config.name.toLowerCase()}! Follow these steps:</p>
                        </div>
                        
                        <div class="contribute-steps">
                            <div class="contribute-step">
                                <div class="step-number-contrib">1</div>
                                <div class="step-content-contrib">
                                    <h4>Create Your ${config.name}</h4>
                                    <p>Add your ${config.name.toLowerCase()} to a category folder in: <code>cli-tool/components/${type}/&lt;category&gt;/</code></p>
                                    <div class="component-structure">
                                        <strong>Structure should include:</strong>
                                        <pre>${config.structure}</pre>
                                    </div>
                                    <div class="step-command">
                                        <strong>Example path:</strong> <code>cli-tool/components/${type}/&lt;category&gt;/${config.example}.${(type === 'mcps' || type === 'settings' || type === 'hooks') ? 'json' : 'md'}</code>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="contribute-step">
                                <div class="step-number-contrib">2</div>
                                <div class="step-content-contrib">
                                    <h4>Follow the Pattern</h4>
                                    <p>Check existing ${type} in the repository to understand the structure and conventions.</p>
                                    <div class="step-command">
                                        <a href="https://github.com/davila7/claude-code-templates/tree/main/cli-tool/components/${type}" target="_blank" class="github-folder-link">
                                            📁 View existing ${type}
                                        </a>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="contribute-step">
                                <div class="step-number-contrib">3</div>
                                <div class="step-content-contrib">
                                    <h4>Test Your Component</h4>
                                    <p>Ensure your ${config.name.toLowerCase()} works correctly with Claude Code.</p>
                                    <div class="step-command">
                                        <code>cd cli-tool && npm test</code>
                                        <button class="copy-btn" onclick="copyToClipboard('cd cli-tool && npm test')">Copy</button>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="contribute-step">
                                <div class="step-number-contrib">4</div>
                                <div class="step-content-contrib">
                                    <h4>Submit Pull Request</h4>
                                    <p>Submit your contribution with proper documentation (replace &lt;category&gt; with your actual category folder):</p>
                                    <div class="step-command">
                                        <code>git add cli-tool/components/${type}/&lt;category&gt;/${config.example}.${(type === 'mcps' || type === 'settings' || type === 'hooks') ? 'json' : 'md'}</code>
                                        <button class="copy-btn" onclick="copyToClipboard('git add cli-tool/components/${type}/<category>/${config.example}.${(type === 'mcps' || type === 'settings' || type === 'hooks') ? 'json' : 'md'}')">Copy</button>
                                    </div>
                                    <div class="step-command">
                                        <code>git commit -m "feat: Add ${config.example} ${config.name.toLowerCase()}"</code>
                                        <button class="copy-btn" onclick="copyToClipboard('git commit -m \\"feat: Add ${config.example} ${config.name.toLowerCase()}\\"')">Copy</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="contribute-footer">
                            <div class="help-section">
                                <h4>Need Help?</h4>
                                <p>Check existing ${type} for examples or open an issue on GitHub for guidance.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Remove existing modal if present
    const existingModal = document.querySelector('.modal-overlay');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Add event listener for ESC key
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            closeComponentModal();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);
}

// Global functions for templates functionality
function showInstallationFiles(languageKey, frameworkKey, displayName) {
    alert(`Installation files for ${displayName} would be shown here`);
}

// Close modal (from script.js)
function closeModal() {
    const modal = document.querySelector('.modal');
    if (modal) {
        modal.remove();
    }
}

// Close component modal
function closeComponentModal() {
    const modalOverlay = document.querySelector('.modal-overlay');
    if (modalOverlay) {
        modalOverlay.remove();
    }
}

// Global pagination function (called from onclick)
function goToPage(page) {
    if (window.indexManager) {
        window.indexManager.goToPage(page);
    }
}

// Clean component name by removing extensions and formatting
function getCleanComponentName(name) {
    if (!name) {
        return 'Unknown Component';
    }
    
    let cleanName = name;
    
    // Remove .md extension if present
    if (cleanName.endsWith('.md')) {
        cleanName = cleanName.slice(0, -3);
    }
    
    // Remove .json extension if present
    if (cleanName.endsWith('.json')) {
        cleanName = cleanName.slice(0, -5);
    }
    
    // Convert kebab-case or snake_case to Title Case
    cleanName = cleanName
        .replace(/[-_]/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
        
    return cleanName;
}

// Handle Add to Cart button click
function handleAddToCart(name, path, type, category, buttonElement) {
    // Prevent event propagation to avoid card flip
    if (window.event) {
        window.event.stopPropagation();
    }
    
    // Clean the component name for better display
    const cleanName = getCleanComponentName(name);
    
    const item = {
        name: cleanName,
        path: path,
        category: category,
        description: `${cleanName} - ${category}`
    };
    
    // Add to cart using the cart manager
    const success = addToCart(item, type);
    
    if (success) {
        // Update button state
        buttonElement.classList.add('added');
        buttonElement.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9,20.42L2.79,14.21L5.62,11.38L9,14.77L18.88,4.88L21.71,7.71L9,20.42Z"/>
            </svg>
            Added to Stack
        `;
        
        // Show a brief animation
        buttonElement.style.transform = 'scale(0.95)';
        setTimeout(() => {
            buttonElement.style.transform = 'scale(1)';
        }, 150);
        
        // Show notification (the cart manager already handles this, but we can add extra visual feedback)
        console.log(`✅ ${name} added to stack successfully!`);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.indexManager = new IndexPageManager();
    window.indexManager.init();

    // Focus search input on page load and setup terminal cursor
    setTimeout(() => {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.focus();
            setupTerminalCursor();
        }
    }, 300); // Small delay to ensure DOM is fully loaded
});

// Terminal cursor functionality
function setupTerminalCursor() {
    const searchInput = document.getElementById('searchInput');
    const cursor = document.getElementById('terminalCursor');
    
    if (!searchInput || !cursor) return;
    
    function updateCursorPosition() {
        const promptWidth = 26; // Width of ">" prompt + extra space
        
        // If input has text, position cursor at the end of the text
        if (searchInput.value.length > 0) {
            // Create a temporary span to measure text width
            const temp = document.createElement('span');
            temp.style.visibility = 'hidden';
            temp.style.position = 'absolute';
            temp.style.whiteSpace = 'pre';
            temp.style.font = window.getComputedStyle(searchInput).font;
            temp.textContent = searchInput.value;
            
            document.body.appendChild(temp);
            const textWidth = temp.getBoundingClientRect().width;
            document.body.removeChild(temp);
            
            cursor.style.left = `${promptWidth + textWidth + 2}px`;
        } else {
            // If input is empty, position cursor right after the prompt with space
            cursor.style.left = `${promptWidth}px`;
        }
    }
    
    // Update cursor position on input
    searchInput.addEventListener('input', updateCursorPosition);
    searchInput.addEventListener('focus', () => {
        cursor.style.display = 'block';
        updateCursorPosition();
    });
    searchInput.addEventListener('blur', () => {
        cursor.style.display = 'none';
    });
    
    // Initial position
    updateCursorPosition();
}