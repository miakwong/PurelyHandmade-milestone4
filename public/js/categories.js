// Category management module
const CategoryManager = {
    // Load categories from API
    async loadCategories() {
        try {
            const response = await fetch('/api/categories.php');
            if (!response.ok) {
                throw new Error('Failed to load categories');
            }
            const categories = await response.json();
            this.renderCategories(categories);
        } catch (error) {
            console.error('Error loading categories:', error);
            showToast('Failed to load categories', 'error');
        }
    },

    // Render categories in the filter sidebar
    renderCategories(categories) {
        const categoryFilters = document.getElementById('category-filters');
        if (!categoryFilters) return;

        // Clear existing categories except "All Categories"
        const allCategoriesCheckbox = categoryFilters.querySelector('#category-all').parentElement;
        categoryFilters.innerHTML = '';
        categoryFilters.appendChild(allCategoriesCheckbox);

        // Add each category as a radio button
        categories.forEach(category => {
            const div = document.createElement('div');
            div.className = 'form-check';
            div.innerHTML = `
                <input class="form-check-input" type="radio" name="category-filter" value="${category.id}" id="category-${category.id}">
                <label class="form-check-label" for="category-${category.id}">
                    ${category.name}
                </label>
            `;
            categoryFilters.appendChild(div);
        });

        // Add event listeners to category filters
        this.addCategoryFilterListeners();
    },

    // Add event listeners to category filters
    addCategoryFilterListeners() {
        const categoryFilters = document.getElementById('category-filters');
        if (!categoryFilters) return;

        categoryFilters.addEventListener('change', (event) => {
            if (event.target.type === 'radio' && event.target.name === 'category-filter') {
                const categoryId = event.target.value;
                this.handleCategoryFilter(categoryId);
            }
        });
    },

    // Handle category filter selection
    handleCategoryFilter(categoryId) {
        // Update product list title
        const productListTitle = document.getElementById('product-list-title');
        const categoryName = categoryId === 'all' ? 'All Products' : 
            document.querySelector(`#category-${categoryId} + label`).textContent;
        productListTitle.textContent = categoryName;

        // Trigger product list refresh with new category filter
        if (typeof ProductManager !== 'undefined') {
            ProductManager.refreshProducts({ categoryId: categoryId === 'all' ? null : categoryId });
        }
    }
};

// Initialize category manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    CategoryManager.loadCategories();
}); 