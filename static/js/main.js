document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const deviceForm = document.getElementById('device-form');
    const deviceList = document.getElementById('device-list');
    const noDevicesMessage = document.getElementById('no-devices');
    const searchInput = document.getElementById('search-input');
    const statusFilter = document.getElementById('status-filter');
    const editModal = new bootstrap.Modal(document.getElementById('edit-modal'));
    const deleteModal = new bootstrap.Modal(document.getElementById('delete-modal'));
    const pendingCount = document.getElementById('pending-count');
    const completedCount = document.getElementById('completed-count');
    const inProgressCount = document.getElementById('in-progress-count');
    const exportCsvBtn = document.getElementById('export-csv');
    const exportExcelBtn = document.getElementById('export-excel');
    
    // Load devices on page load
    loadDevices();
    
    // Event Listeners
    deviceForm.addEventListener('submit', addDevice);
    searchInput.addEventListener('input', filterDevices);
    statusFilter.addEventListener('change', filterDevices);
    document.getElementById('save-edit').addEventListener('click', saveEditDevice);
    document.getElementById('confirm-delete').addEventListener('click', confirmDeleteDevice);
    exportCsvBtn.addEventListener('click', exportToCsv);
    exportExcelBtn.addEventListener('click', exportToExcel);
    
    // Functions
    async function loadDevices() {
        try {
            const response = await fetch('/api/devices');
            const devices = await response.json();
            
            renderDevices(devices);
            updateCounters(devices);
        } catch (error) {
            console.error('Error loading devices:', error);
            alert('加载设备列表失败。请刷新页面重试。');
        }
    }
    
    function renderDevices(devices) {
        deviceList.innerHTML = '';
        
        if (devices.length === 0) {
            deviceList.innerHTML = '';
            noDevicesMessage.classList.remove('d-none');
            return;
        }
        
        noDevicesMessage.classList.add('d-none');
        
        devices.forEach(device => {
            const row = document.createElement('tr');
            
            // Set status badge class
            let statusClass = '';
            if (device.status === '待处理') {
                statusClass = 'status-pending';
            } else if (device.status === '已完成') {
                statusClass = 'status-completed';
            } else if (device.status === '处理中') {
                statusClass = 'status-in-progress';
            }
            
            row.innerHTML = `
                <td>${device.id}</td>
                <td>${device.project || '-'}</td>
                <td>${device.name}</td>
                <td>${device.unit || '-'}</td>
                <td>${device.department || '-'}</td>
                <td>${device.description || '-'}</td>
                <td><span class="status-badge ${statusClass}">${device.status}</span></td>
                <td>${device.last_updated}</td>
                <td class="action-buttons">
                    <button class="btn btn-sm btn-outline-primary edit-btn" data-id="${device.id}">
                        编辑
                    </button>
                    <button class="btn btn-sm btn-outline-danger delete-btn" data-id="${device.id}">
                        删除
                    </button>
                </td>
            `;
            
            deviceList.appendChild(row);
        });
        
        // Add event listeners to edit and delete buttons
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', () => openEditModal(btn.dataset.id));
        });
        
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', () => openDeleteModal(btn.dataset.id));
        });
    }
    
    function updateCounters(devices) {
        const pending = devices.filter(d => d.status === '待处理').length;
        const completed = devices.filter(d => d.status === '已完成').length;
        const inProgress = devices.filter(d => d.status === '处理中').length;
        
        pendingCount.textContent = pending;
        completedCount.textContent = completed;
        inProgressCount.textContent = inProgress;
    }
    
    async function addDevice(e) {
        e.preventDefault();
        
        const projectInput = document.getElementById('device-project');
        const nameInput = document.getElementById('device-name');
        const unitInput = document.getElementById('device-unit');
        const departmentInput = document.getElementById('device-department');
        const descriptionInput = document.getElementById('device-description');
        const statusInput = document.getElementById('device-status');
        
        const deviceData = {
            project: projectInput.value.trim(),
            name: nameInput.value.trim(),
            unit: unitInput.value.trim(),
            department: departmentInput.value.trim(),
            description: descriptionInput.value.trim(),
            status: statusInput.value
        };
        
        if (!deviceData.name) {
            alert('请输入设备名称');
            return;
        }
        
        try {
            const response = await fetch('/api/devices', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(deviceData)
            });
            
            if (response.ok) {
                // Reset form
                projectInput.value = '';
                nameInput.value = '';
                unitInput.value = '';
                departmentInput.value = '';
                descriptionInput.value = '';
                statusInput.value = '待处理';
                
                // Reload devices
                loadDevices();
            } else {
                alert('添加设备失败。请重试。');
            }
        } catch (error) {
            console.error('Error adding device:', error);
            alert('添加设备失败。请重试。');
        }
    }
    
    function filterDevices() {
        const searchTerm = searchInput.value.toLowerCase();
        const statusValue = statusFilter.value;
        
        const rows = deviceList.querySelectorAll('tr');
        
        rows.forEach(row => {
            const project = row.cells[1].textContent.toLowerCase();
            const name = row.cells[2].textContent.toLowerCase();
            const unit = row.cells[3].textContent.toLowerCase();
            const department = row.cells[4].textContent.toLowerCase();
            const description = row.cells[5].textContent.toLowerCase();
            const status = row.cells[6].textContent.trim();
            
            const matchesSearch = project.includes(searchTerm) || 
                                 name.includes(searchTerm) || 
                                 unit.includes(searchTerm) || 
                                 department.includes(searchTerm) || 
                                 description.includes(searchTerm);
            const matchesStatus = statusValue === 'all' || status === statusValue;
            
            if (matchesSearch && matchesStatus) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }
    
    async function openEditModal(id) {
        try {
            const response = await fetch(`/api/devices`);
            const devices = await response.json();
            const device = devices.find(d => d.id == id);
            
            if (device) {
                document.getElementById('edit-id').value = device.id;
                document.getElementById('edit-project').value = device.project || '';
                document.getElementById('edit-name').value = device.name;
                document.getElementById('edit-unit').value = device.unit || '';
                document.getElementById('edit-department').value = device.department || '';
                document.getElementById('edit-description').value = device.description || '';
                document.getElementById('edit-status').value = device.status;
                
                editModal.show();
            }
        } catch (error) {
            console.error('Error fetching device details:', error);
            alert('获取设备详情失败。请重试。');
        }
    }
    
    function openDeleteModal(id) {
        document.getElementById('delete-id').value = id;
        deleteModal.show();
    }
    
    async function saveEditDevice() {
        const id = document.getElementById('edit-id').value;
        const project = document.getElementById('edit-project').value.trim();
        const name = document.getElementById('edit-name').value.trim();
        const unit = document.getElementById('edit-unit').value.trim();
        const department = document.getElementById('edit-department').value.trim();
        const description = document.getElementById('edit-description').value.trim();
        const status = document.getElementById('edit-status').value;
        
        if (!name) {
            alert('请输入设备名称');
            return;
        }
        
        const deviceData = {
            project,
            name,
            unit,
            department,
            description,
            status
        };
        
        try {
            const response = await fetch(`/api/devices/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(deviceData)
            });
            
            if (response.ok) {
                editModal.hide();
                loadDevices();
            } else {
                alert('更新设备失败。请重试。');
            }
        } catch (error) {
            console.error('Error updating device:', error);
            alert('更新设备失败。请重试。');
        }
    }
    
    async function confirmDeleteDevice() {
        const id = document.getElementById('delete-id').value;
        
        try {
            const response = await fetch(`/api/devices/${id}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                deleteModal.hide();
                loadDevices();
            } else {
                alert('删除设备失败。请重试。');
            }
        } catch (error) {
            console.error('Error deleting device:', error);
            alert('删除设备失败。请重试。');
        }
    }
    
    // Export functions
    function exportToCsv() {
        const currentStatus = statusFilter.value;
        const url = `/api/export/csv${currentStatus !== 'all' ? `?status=${currentStatus}` : ''}`;
        window.location.href = url;
    }
    
    function exportToExcel() {
        const currentStatus = statusFilter.value;
        const url = `/api/export/excel${currentStatus !== 'all' ? `?status=${currentStatus}` : ''}`;
        window.location.href = url;
    }
});
