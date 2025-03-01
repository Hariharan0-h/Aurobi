// Global state
let state = {
    tables: [],
    selectedTable: null,
    tableSchema: [],
    tableData: [],
    availableAttributes: [],
    selectedAttributes: [],
    relations: [],
    savedDatasets: [],
    chart: null,
    filteredData: [],
    groupedData: [],
    currentFilter: null,
    currentGrouping: null
};

function saveAsDataset() {
    if (!state.selectedTable || state.selectedAttributes.length === 0) {
        alert("Please select a table and at least one attribute first");
        return;
    }
    
    // Prompt for dataset name
    const datasetName = prompt("Enter a name for this dataset:", `${state.selectedTable}_dataset`);
    if (!datasetName) return;
    
    // Create dataset object
    const newDataset = {
        id: Date.now(), // unique ID
        name: datasetName,
        table: state.selectedTable,
        attributes: [...state.selectedAttributes],
        createdAt: new Date().toISOString()
    };
    
    // Add to state
    state.savedDatasets.push(newDataset);
    
    // Save to localStorage for persistence
    localStorage.setItem('dashboardDatasets', JSON.stringify(state.savedDatasets));
    
    // Update datasets tab
    renderDatasets();
    
    // Switch to datasets tab
    const datasetsTab = document.querySelector('.tab[data-tab="datasets"]');
    datasetsTab.click();
}

// Function to load saved datasets
function loadSavedDatasets() {
    const saved = localStorage.getItem('dashboardDatasets');
    if (saved) {
        state.savedDatasets = JSON.parse(saved);
    }
}

// Function to render datasets in the datasets tab
function renderDatasets() {
    const datasetsContent = document.getElementById('datasets-content');
    
    if (state.savedDatasets.length === 0) {
        datasetsContent.innerHTML = '<p>Saved datasets will appear here</p>';
        return;
    }
    
    let html = '<div class="saved-datasets">';
    html += '<h3>Saved Datasets</h3>';
    html += '<ul class="datasets-list">';
    
    state.savedDatasets.forEach(dataset => {
        html += `
            <li class="dataset-item" data-id="${dataset.id}">
                <div class="dataset-info">
                    <h4>${dataset.name}</h4>
                    <p>Table: ${dataset.table}</p>
                    <p>Attributes: ${dataset.attributes.join(', ')}</p>
                    <p class="dataset-date">Created: ${new Date(dataset.createdAt).toLocaleString()}</p>
                </div>
                <div class="dataset-actions">
                    <button class="btn load-dataset-btn" onclick="loadDataset(${dataset.id})">Load</button>
                    <button class="btn delete-dataset-btn" onclick="deleteDataset(${dataset.id})">Delete</button>
                </div>
            </li>
        `;
    });
    
    html += '</ul></div>';
    datasetsContent.innerHTML = html;
}

// Function to load a dataset
function loadDataset(datasetId) {
    const dataset = state.savedDatasets.find(ds => ds.id === datasetId);
    if (!dataset) return;
    
    // Set the table and attributes according to the dataset
    selectTable(dataset.table);
    
    // We need to wait for the table data to load before setting attributes
    // This is a simple way to handle the async nature
    setTimeout(() => {
        state.selectedAttributes = [...dataset.attributes];
        renderAttributes();
        renderDataTable();
        updateFilterAndGroupSelects();
        updateChart();
    }, 500);
}

// Function to delete a dataset
function deleteDataset(datasetId) {
    if (!confirm("Are you sure you want to delete this dataset?")) return;
    
    state.savedDatasets = state.savedDatasets.filter(ds => ds.id !== datasetId);
    localStorage.setItem('dashboardDatasets', JSON.stringify(state.savedDatasets));
    renderDatasets();
}

// Add a Save Dataset button to the actions div in init()
function addSaveDatasetButton() {
    const actionsDiv = document.querySelector('.actions');
    const saveDatasetBtn = document.createElement('button');
    saveDatasetBtn.id = 'save-dataset-btn';
    saveDatasetBtn.className = 'btn save-dataset-btn';
    saveDatasetBtn.textContent = 'Save Dataset';
    saveDatasetBtn.addEventListener('click', saveAsDataset);
    actionsDiv.appendChild(saveDatasetBtn);
}

// DOM Elements
const tableList = document.getElementById('table-list');
const availableAttributesList = document.getElementById('available-attributes');
const selectedAttributesList = document.getElementById('selected-attributes');
const tableHeader = document.getElementById('table-header');
const tableBody = document.getElementById('table-body');
const exportBtn = document.getElementById('export-btn');
const moveRightBtn = document.getElementById('move-right');
const moveLeftBtn = document.getElementById('move-left');
const chartTypeSelect = document.getElementById('chart-type');
const dataFieldSelect = document.getElementById('data-field');
const chartCanvas = document.getElementById('chart-canvas');
const filterFieldSelect = document.getElementById('filter-field');
const filterOperatorSelect = document.getElementById('filter-operator');
const filterValueInput = document.getElementById('filter-value');
const applyFilterBtn = document.getElementById('apply-filter');
const clearFilterBtn = document.getElementById('clear-filter');
const groupFieldSelect = document.getElementById('group-field');
const applyGroupBtn = document.getElementById('apply-group');
const clearGroupBtn = document.getElementById('clear-group');

// Initialize
document.addEventListener('DOMContentLoaded', init);

function init() {
    // Set up tab switching
    setupTabs();
    
    // Fetch tables
    fetchTables();
    
    // Fetch relations
    fetchRelations();

    addSaveDatasetButton();
    
    // Load saved datasets
    loadSavedDatasets();
    
    // Render datasets
    renderDatasets();
    
    setupFilterControls();
    setupGroupControls();

    // Set up event listeners
    moveRightBtn.addEventListener('click', () => moveAllAttributes('right'));
    moveLeftBtn.addEventListener('click', () => moveAllAttributes('left'));
    exportBtn.addEventListener('click', exportData);
    chartTypeSelect.addEventListener('change', updateChart);
    dataFieldSelect.addEventListener('change', updateChart);
    
    // Setup tooltips
    setupTooltips();
}

function setupTooltips() {
    // Add tooltip to buttons with title attribute
    document.querySelectorAll('[title]').forEach(el => {
        el.classList.add('tooltip');
    });
}

function setupTabs() {
    const tabs = document.querySelectorAll('.tab');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs
            tabs.forEach(t => t.classList.remove('active'));
            
            // Add active class to clicked tab
            tab.classList.add('active');
            
            // Show the corresponding content
            const tabName = tab.dataset.tab;
            document.querySelectorAll('.tab-content > div').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(`${tabName}-content`).classList.add('active');
        });
    });
}

function setupFilterControls() {
    applyFilterBtn.addEventListener('click', applyFilter);
    clearFilterBtn.addEventListener('click', clearFilter);
    
    // Add event listener for "Enter" key in filter value input
    filterValueInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            applyFilter();
        }
    });
}

function setupGroupControls() {
    applyGroupBtn.addEventListener('click', applyGrouping);
    clearGroupBtn.addEventListener('click', clearGrouping);
}

function updateFilterAndGroupSelects() {
    if (!state.selectedAttributes || state.selectedAttributes.length === 0) {
        return;
    }

    // Update filter field select
    filterFieldSelect.innerHTML = '';
    state.selectedAttributes.forEach(attr => {
        const option = document.createElement('option');
        option.value = attr;
        option.textContent = attr;
        filterFieldSelect.appendChild(option);
    });
    
    // Update group field select
    groupFieldSelect.innerHTML = '';
    state.selectedAttributes.forEach(attr => {
        const option = document.createElement('option');
        option.value = attr;
        option.textContent = attr;
        groupFieldSelect.appendChild(option);
    });
    
    // Also update the data field select for charts
    updateDataFieldSelect();
}

function applyFilter() {
    const field = filterFieldSelect.value;
    const operator = filterOperatorSelect.value;
    const value = filterValueInput.value;
    
    if (!field || value === '') {
        alert('Please select a field and enter a value to filter by');
        return;
    }
    
    state.currentFilter = { field, operator, value };
    
    // Apply filter to tableData
    state.filteredData = state.tableData.filter(row => {
        if (row[field] === undefined || row[field] === null) {
            return false;
        }
        
        const cellValue = String(row[field]).toLowerCase();
        const filterValue = value.toLowerCase();
        
        switch(operator) {
            case 'equals':
                return cellValue === filterValue;
            case 'contains':
                return cellValue.includes(filterValue);
            case 'greater':
                return !isNaN(parseFloat(cellValue)) && !isNaN(parseFloat(filterValue)) && 
                       parseFloat(cellValue) > parseFloat(filterValue);
            case 'less':
                return !isNaN(parseFloat(cellValue)) && !isNaN(parseFloat(filterValue)) && 
                       parseFloat(cellValue) < parseFloat(filterValue);
            default:
                return true;
        }
    });
    
    // Clear grouping when applying a new filter
    if (state.currentGrouping) {
        clearGrouping();
    }
    
    // Add visual feedback for active filter
    document.querySelector('.filter-controls').classList.add('active-filter');
    
    renderDataTable();
    updateChart();
}

function clearFilter() {
    state.currentFilter = null;
    state.filteredData = [];
    filterValueInput.value = '';
    document.querySelector('.filter-controls').classList.remove('active-filter');
    renderDataTable();
    updateChart();
}

function applyGrouping() {
    const field = groupFieldSelect.value;
    
    if (!field) {
        alert('Please select a field to group by');
        return;
    }
    
    state.currentGrouping = { field };
    
    // Group the data (filtered or original)
    const dataToGroup = state.currentFilter ? state.filteredData : state.tableData;
    
    if (dataToGroup.length === 0) {
        alert('No data to group. Please check your filter.');
        state.currentGrouping = null;
        return;
    }
    
    const groupedObj = {};
    
    dataToGroup.forEach(row => {
        const groupValue = row[field] || 'Unknown';
        if (!groupedObj[groupValue]) {
            groupedObj[groupValue] = [];
        }
        groupedObj[groupValue].push(row);
    });
    
    // Convert to array format with count and aggregates
    state.groupedData = Object.keys(groupedObj).map(key => {
        const group = groupedObj[key];
        const result = { [field]: key, count: group.length };
        
        // For numeric fields, calculate sum, avg, min, max
        state.selectedAttributes.forEach(attr => {
            if (attr !== field) {
                // Check if the field contains numeric values
                const hasNumericValues = group.some(row => !isNaN(parseFloat(row[attr])));
                
                if (hasNumericValues) {
                    const values = group
                        .filter(row => row[attr] !== null && row[attr] !== undefined && !isNaN(parseFloat(row[attr])))
                        .map(row => parseFloat(row[attr]));
                    
                    if (values.length > 0) {
                        result[`sum_${attr}`] = values.reduce((a, b) => a + b, 0);
                        result[`avg_${attr}`] = result[`sum_${attr}`] / values.length;
                        result[`min_${attr}`] = Math.min(...values);
                        result[`max_${attr}`] = Math.max(...values);
                    }
                }
            }
        });
        
        return result;
    });
    
    // Add visual feedback for active grouping
    document.querySelector('.group-controls').classList.add('active-group');
    
    renderGroupedDataTable();
    updateGroupedChart();
}

function updateGroupedChart() {
    if (state.groupedData.length === 0) {
        return;
    }
    
    // Destroy previous chart if exists
    if (state.chart) {
        state.chart.destroy();
    }
    
    const chartType = chartTypeSelect.value;
    const groupField = state.currentGrouping.field;
    
    // Create chart for grouped data
    const ctx = chartCanvas.getContext('2d');
    const labels = state.groupedData.map(row => row[groupField]);
    
    if (chartType === 'pie') {
        state.chart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: state.groupedData.map(row => row.count),
                    backgroundColor: labels.map((_, index) => getChartColor(index)),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: `Count by ${groupField}`,
                        font: {
                            size: 16
                        }
                    },
                    legend: {
                        position: 'right',
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((context.raw / total) * 100);
                                return `${context.label}: ${context.raw} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    } else if (chartType === 'bar') {
        state.chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: `Count by ${groupField}`,
                    data: state.groupedData.map(row => row.count),
                    backgroundColor: getChartColor(0),
                    borderColor: getDarkerColor(getChartColor(0)),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: `Count by ${groupField}`,
                        font: {
                            size: 16
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Count'
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: groupField
                        }
                    }
                }
            }
        });
    }
}

function clearGrouping() {
    state.currentGrouping = null;
    state.groupedData = [];
    document.querySelector('.group-controls').classList.remove('active-group');
    renderDataTable();
    updateChart();
}

// API Functions
async function fetchTables() {
    try {
        const response = await fetch('https://localhost:7129/api/database/tables');
        state.tables = await response.json();
        renderTableList();
    } catch (error) {
        console.error("Error fetching tables:", error);
        showError("Failed to load tables. Please check your API connection.");
        // Fallback with sample data for demo/development
        state.tables = ['Customers', 'Orders', 'Products', 'Employees'];
        renderTableList();
    }
}

async function fetchTableSchema(tableName) {
    try {
        const response = await fetch(`https://localhost:7129/api/database/schema/${tableName}`);
        state.tableSchema = await response.json();
        // Update available attributes
        state.availableAttributes = state.tableSchema.map(column => column.column_name);
        // By default, select all attributes
        state.selectedAttributes = [...state.availableAttributes];
        renderAttributes();
        updateFilterAndGroupSelects();
    } catch (error) {
        console.error(`Error fetching schema for ${tableName}:`, error);
        showError(`Failed to load schema for ${tableName}.`);
        
        // Fallback with sample schema for demo/development
        if (tableName === 'Customers') {
            state.availableAttributes = ['CustomerId', 'CompanyName', 'ContactName', 'City', 'Country', 'Phone'];
        } else if (tableName === 'Orders') {
            state.availableAttributes = ['OrderId', 'CustomerId', 'EmployeeId', 'OrderDate', 'ShipCountry'];
        } else if (tableName === 'Products') {
            state.availableAttributes = ['ProductId', 'ProductName', 'UnitPrice', 'CategoryId', 'UnitsInStock'];
        } else {
            state.availableAttributes = ['Field1', 'Field2', 'Field3', 'Field4', 'Field5'];
        }
        
        state.selectedAttributes = [...state.availableAttributes];
        renderAttributes();
        updateFilterAndGroupSelects();
    }
}

async function fetchTableData(tableName) {
    try {
        const response = await fetch(`https://localhost:7129/api/database/data/${tableName}`);
        state.tableData = await response.json();
        renderDataTable();
        updateChart();
        exportBtn.disabled = false;
    } catch (error) {
        console.error(`Error fetching data for ${tableName}:`, error);
        showError(`Failed to load data for ${tableName}.`);
        
        // Fallback with sample data for demo/development
        if (tableName === 'Customers') {
            state.tableData = [
                { CustomerId: 'ALFKI', CompanyName: 'Alfreds Futterkiste', ContactName: 'Maria Anders', City: 'Berlin', Country: 'Germany', Phone: '030-0074321' },
                { CustomerId: 'ANATR', CompanyName: 'Ana Trujillo Emparedados', ContactName: 'Ana Trujillo', City: 'México D.F.', Country: 'Mexico', Phone: '(5) 555-4729' },
                { CustomerId: 'ANTON', CompanyName: 'Antonio Moreno Taquería', ContactName: 'Antonio Moreno', City: 'México D.F.', Country: 'Mexico', Phone: '(5) 555-3932' }
            ];
        } else if (tableName === 'Orders') {
            state.tableData = [
                { OrderId: 10248, CustomerId: 'VINET', EmployeeId: 5, OrderDate: '1996-07-04', ShipCountry: 'France' },
                { OrderId: 10249, CustomerId: 'TOMSP', EmployeeId: 6, OrderDate: '1996-07-05', ShipCountry: 'Germany' },
                { OrderId: 10250, CustomerId: 'HANAR', EmployeeId: 4, OrderDate: '1996-07-08', ShipCountry: 'Brazil' }
            ];
        } else if (tableName === 'Products') {
            state.tableData = [
                { ProductId: 1, ProductName: 'Chai', UnitPrice: 18.00, CategoryId: 1, UnitsInStock: 39 },
                { ProductId: 2, ProductName: 'Chang', UnitPrice: 19.00, CategoryId: 1, UnitsInStock: 17 },
                { ProductId: 3, ProductName: 'Aniseed Syrup', UnitPrice: 10.00, CategoryId: 2, UnitsInStock: 13 }
            ];
        } else {
            state.tableData = [
                { Field1: 'Value1', Field2: 'Value2', Field3: 100, Field4: 200, Field5: 'Text' },
                { Field1: 'Value3', Field2: 'Value4', Field3: 300, Field4: 400, Field5: 'Text' },
                { Field1: 'Value5', Field2: 'Value6', Field3: 500, Field4: 600, Field5: 'Text' }
            ];
        }
        
        renderDataTable();
        updateChart();
        exportBtn.disabled = false;
    }
}

async function fetchRelations() {
    try {
        const response = await fetch('https://localhost:7129/api/database/primary-keys');
        state.relations = await response.json();
        // Re-render table list with relations
        if (state.tables.length > 0) {
            renderTableList();
        }
    } catch (error) {
        console.error("Error fetching relations:", error);
        
        // Fallback with sample relations for demo/development
        state.relations = [
            { primary_table: 'Customers', primary_column: 'CustomerId', foreign_table: 'Orders', foreign_column: 'CustomerId' },
            { primary_table: 'Products', primary_column: 'ProductId', foreign_table: 'Order Details', foreign_column: 'ProductId' }
        ];
    }
}

// Render Functions
function renderTableList() {
    tableList.innerHTML = '';
    
    state.tables.forEach(table => {
        const li = document.createElement('li');
        li.textContent = table;
        li.classList.toggle('selected', table === state.selectedTable);
        
        // Check if there are relations for this table
        const tableRelations = state.relations.filter(r => 
            r.primary_table === table || r.foreign_table === table
        );
        
        if (tableRelations.length > 0 && table === state.selectedTable) {
            const relationsDiv = document.createElement('div');
            relationsDiv.className = 'relations';
            
            const relationsTitle = document.createElement('small');
            relationsTitle.textContent = 'Relations:';
            relationsDiv.appendChild(relationsTitle);
            
            const relationsList = document.createElement('ul');
            
            tableRelations.forEach(relation => {
                const relationLi = document.createElement('li');
                if (relation.primary_table === table) {
                    relationLi.textContent = `→ ${relation.foreign_table} (${relation.foreign_column})`;
                } else {
                    relationLi.textContent = `← ${relation.primary_table} (${relation.primary_column})`;
                }
                relationsList.appendChild(relationLi);
            });
            
            relationsDiv.appendChild(relationsList);
            li.appendChild(relationsDiv);
        }
        
        li.addEventListener('click', () => {
            selectTable(table);
        });
        
        tableList.appendChild(li);
    });
}

function renderAttributes() {
    availableAttributesList.innerHTML = '';
    selectedAttributesList.innerHTML = '';
    
    // Available attributes are those not in selected
    const availableAttrSet = state.availableAttributes.filter(
        attr => !state.selectedAttributes.includes(attr)
    );
    
    availableAttrSet.forEach(attr => {
        const li = document.createElement('li');
        li.className = 'attribute-item';
        li.textContent = attr;
        li.addEventListener('click', () => {
            selectAttribute(attr);
        });
        availableAttributesList.appendChild(li);
    });
    
    state.selectedAttributes.forEach(attr => {
        const li = document.createElement('li');
        li.className = 'attribute-item selected';
        li.textContent = attr;
        li.addEventListener('click', () => {
            unselectAttribute(attr);
        });
        selectedAttributesList.appendChild(li);
    });
}

function renderGroupedDataTable() {
    if (state.groupedData.length === 0) {
        tableHeader.innerHTML = '';
        tableBody.innerHTML = '';
        return;
    }
    
    const groupField = state.currentGrouping.field;
    
    // Determine columns to show
    const columns = [groupField, 'count'];
    
    state.groupedData.forEach(row => {
        Object.keys(row).forEach(key => {
            if (key !== groupField && key !== 'count' && !columns.includes(key)) {
                columns.push(key);
            }
        });
    });
    
    // Render header
    tableHeader.innerHTML = `
        <tr>
            ${columns.map(col => `<th>${col}</th>`).join('')}
        </tr>
    `;
    
    // Render body
    tableBody.innerHTML = '';
    state.groupedData.forEach((row) => {
        const tr = document.createElement('tr');
        
        columns.forEach(col => {
            const td = document.createElement('td');
            if (col.startsWith('avg_')) {
                td.textContent = row[col] !== undefined ? row[col].toFixed(2) : '';
            } else if (col.startsWith('sum_') || col.startsWith('min_') || col.startsWith('max_')) {
                td.textContent = row[col] !== undefined ? row[col] : '';
            } else {
                td.textContent = row[col] !== undefined ? row[col] : '';
            }
            tr.appendChild(td);
        });
        
        tableBody.appendChild(tr);
    });
}

function renderDataTable() {
    // Determine which data to display
    let dataToRender;
    
    if (state.currentGrouping) {
        return renderGroupedDataTable();
    } else if (state.currentFilter) {
        dataToRender = state.filteredData;
    } else {
        dataToRender = state.tableData;
    }
    
    if (dataToRender.length === 0 || state.selectedAttributes.length === 0) {
        tableHeader.innerHTML = '';
        tableBody.innerHTML = '<tr><td colspan="100%" class="no-data">No data to display</td></tr>';
        return;
    }
    
    // Render header
    tableHeader.innerHTML = `
        <tr>
            ${state.selectedAttributes.map(attr => `<th>${attr}</th>`).join('')}
        </tr>
    `;
    
    // Render body
    tableBody.innerHTML = '';
    
    // Show only first 1000 rows for performance
    const maxRows = 1000;
    const dataSlice = dataToRender.slice(0, maxRows);
    
    dataSlice.forEach((row) => {
        const tr = document.createElement('tr');
        
        state.selectedAttributes.forEach(attr => {
            const td = document.createElement('td');
            td.textContent = row[attr] !== undefined ? row[attr] : '';
            tr.appendChild(td);
        });
        
        tableBody.appendChild(tr);
    });
    
    // Add row count info if data is large
    if (dataToRender.length > maxRows) {
        const infoRow = document.createElement('tr');
        infoRow.className = 'info-row';
        const infoCell = document.createElement('td');
        infoCell.colSpan = state.selectedAttributes.length;
        infoCell.textContent = `Showing ${maxRows} of ${dataToRender.length} rows`;
        infoRow.appendChild(infoCell);
        tableBody.appendChild(infoRow);
    }
}

// Chart functions
function updateDataFieldSelect() {
    dataFieldSelect.innerHTML = '';
    
    state.selectedAttributes.forEach(attr => {
        const option = document.createElement('option');
        option.value = attr;
        option.textContent = attr;
        dataFieldSelect.appendChild(option);
    });
}

function updateChart() {
    if (state.currentGrouping) {
        return updateGroupedChart();
    }
    
    const dataToUse = state.currentFilter ? state.filteredData : state.tableData;
    
    if (dataToUse.length === 0 || state.selectedAttributes.length === 0) {
        clearChart();
        return;
    }
    
    // Destroy previous chart if exists
    if (state.chart) {
        state.chart.destroy();
    }
    
    const chartType = chartTypeSelect.value;
    const dataField = dataFieldSelect.value;
    
    if (chartType === 'pie') {
        renderPieChart(dataField, dataToUse);
    } else if (chartType === 'bar') {
        renderBarChart(dataField, dataToUse);
    }
}

function clearChart() {
    if (state.chart) {
        state.chart.destroy();
        state.chart = null;
    }
    
    // Clear canvas
    const ctx = chartCanvas.getContext('2d');
    ctx.clearRect(0, 0, chartCanvas.width, chartCanvas.height);
}

function renderPieChart(dataField, dataToUse) {
    // Count occurrences of each value in the data field
    const counts = {};
    
    dataToUse.forEach(row => {
        const value = row[dataField] || 'Unknown';
        counts[value] = (counts[value] || 0) + 1;
    });
    
    // Sort by count (descending)
    const sortedLabels = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    
    // Limit to top 15 values for readability
    const maxSlices = 15;
    const displayLabels = sortedLabels.slice(0, maxSlices);
    
    // Group the rest as "Other" if needed
    if (sortedLabels.length > maxSlices) {
        const otherCount = sortedLabels.slice(maxSlices).reduce((sum, label) => sum + counts[label], 0);
        counts['Other'] = otherCount;
        displayLabels.push('Other');
    }
    
    // Prepare data for Chart.js
    const data = displayLabels.map(label => counts[label]);
    
    // Create the chart
    const ctx = chartCanvas.getContext('2d');
    state.chart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: displayLabels,
            datasets: [{
                data: data,
                backgroundColor: displayLabels.map((_, index) => getChartColor(index)),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                text: `Distribution of ${dataField}`,
                font: {
                    size: 16
                }
            },
            legend: {
                position: 'right',
            },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                        const percentage = Math.round((context.raw / total) * 100);
                        return `${context.label}: ${context.raw} (${percentage}%)`;
                    }
                }
            }
        }
    }
});
}
function renderBarChart(dataField, dataToUse) {
// Count occurrences of each value in the data field
const counts = {};
dataToUse.forEach(row => {
    const value = row[dataField] || 'Unknown';
    counts[value] = (counts[value] || 0) + 1;
});

// Sort by count (descending)
const sortedLabels = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);

// Limit to top 20 values for readability
const maxBars = 20;
const displayLabels = sortedLabels.slice(0, maxBars);

// Prepare data for Chart.js
const data = displayLabels.map(label => counts[label]);

// Create the chart
const ctx = chartCanvas.getContext('2d');
state.chart = new Chart(ctx, {
    type: 'bar',
    data: {
        labels: displayLabels,
        datasets: [{
            label: dataField,
            data: data,
            backgroundColor: getChartColor(0),
            borderColor: getDarkerColor(getChartColor(0)),
            borderWidth: 1
        }]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            title: {
                display: true,
                text: `Distribution of ${dataField}`,
                font: {
                    size: 16
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: 'Count'
                }
            },
            x: {
                title: {
                    display: true,
                    text: dataField
                }
            }
        }
    }
});
}
// Helper functions
function getChartColor(index) {
const colors = [
'rgba(54, 162, 235, 0.8)',
'rgba(255, 99, 132, 0.8)',
'rgba(75, 192, 192, 0.8)',
'rgba(255, 206, 86, 0.8)',
'rgba(153, 102, 255, 0.8)',
'rgba(255, 159, 64, 0.8)'
];
// Cycle through colors if more are needed
return colors[index % colors.length];
}
function getDarkerColor(rgba) {
// Parse RGBA string to get components
const match = rgba.match(/rgba((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+))/);
if (match) {
const r = Math.max(0, parseInt(match[1]) - 20);
const g = Math.max(0, parseInt(match[2]) - 20);
const b = Math.max(0, parseInt(match[3]) - 20);
const a = match[4];
return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + a + ')';
}
return rgba;
}
function selectTable(table) {
state.selectedTable = table;
renderTableList();
fetchTableSchema(table);
fetchTableData(table);
}
function selectAttribute(attr) {
state.selectedAttributes.push(attr);
renderAttributes();
renderDataTable();
updateFilterAndGroupSelects();
updateChart();
}
function unselectAttribute(attr) {
state.selectedAttributes = state.selectedAttributes.filter(a => a !== attr);
renderAttributes();
renderDataTable();
updateFilterAndGroupSelects();
updateChart();
}
function moveAllAttributes(direction) {
if (direction === 'right') {
// Move all from available to selected
state.selectedAttributes = [...new Set([...state.selectedAttributes, ...state.availableAttributes])];
} else if (direction === 'left') {
// Clear selected attributes
state.selectedAttributes = [];
}
CopyrenderAttributes();
renderDataTable();
updateFilterAndGroupSelects();
updateChart();
}
function exportData() {
// Determine which data to export
let dataToExport;
if (state.currentGrouping) {
    dataToExport = state.groupedData;
} else if (state.currentFilter) {
    dataToExport = state.filteredData;
} else {
    dataToExport = state.tableData;
}

if (dataToExport.length === 0) {
    alert('No data to export');
    return;
}

// Convert to CSV
const headers = state.currentGrouping 
    ? Object.keys(dataToExport[0])
    : state.selectedAttributes;

const csvContent = [
    headers.join(','),
    ...dataToExport.map(row => {
        return headers.map(header => {
            // Handle CSV escaping (wrap in quotes if contains comma or is empty)
            const value = row[header] !== undefined && row[header] !== null ? row[header] : '';
            if (value === '' || String(value).includes(',') || String(value).includes('"') || String(value).includes('\n')) {
                return `"${String(value).replace(/"/g, '""')}"`;
            }
            return value;
        }).join(',');
    })
].join('\n');

// Create download link
const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
const url = URL.createObjectURL(blob);
const link = document.createElement('a');
link.setAttribute('href', url);
link.setAttribute('download', `${state.selectedTable}_export.csv`);
document.body.appendChild(link);
link.click();
document.body.removeChild(link);
}
function showError(message) {
const errorDiv = document.createElement('div');
errorDiv.className = 'error-message';
errorDiv.textContent = message;
document.body.appendChild(errorDiv);

setTimeout(() => {
    errorDiv.classList.add('show');
}, 10);

setTimeout(() => {
    errorDiv.classList.remove('show');
    setTimeout(() => {
        document.body.removeChild(errorDiv);
    }, 300);
}, 3000);
}