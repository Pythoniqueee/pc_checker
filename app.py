from flask import Flask, render_template, request, redirect, url_for, jsonify, send_file
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import os
import io
import csv
import pytz

app = Flask(__name__)

# Configure the SQLite database
basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'devices.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'your-secret-key'

db = SQLAlchemy(app)

# Define the Device model
class Device(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    project = db.Column(db.String(100))  # 维护项目
    name = db.Column(db.String(100), nullable=False)
    unit = db.Column(db.String(100))  # 所属单位
    department = db.Column(db.String(100))  # 部门
    description = db.Column(db.String(200))
    status = db.Column(db.String(20), default='待处理')  # Default status is 'Pending'
    last_updated = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        # Convert UTC time to Malaysia time (UTC+8)
        malaysia_tz = pytz.timezone('Asia/Kuala_Lumpur')
        utc_time = pytz.utc.localize(self.last_updated)
        malaysia_time = utc_time.astimezone(malaysia_tz)
        
        return {
            'id': self.id,
            'project': self.project or '',
            'name': self.name,
            'unit': self.unit or '',
            'department': self.department or '',
            'description': self.description,
            'status': self.status,
            'last_updated': malaysia_time.strftime('%d/%m/%Y %I:%M %p')  # Malaysia format: DD/MM/YYYY HH:MM AM/PM
        }

# Create the database tables
with app.app_context():
    db.create_all()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/devices', methods=['GET'])
def get_devices():
    devices = Device.query.all()
    return jsonify([device.to_dict() for device in devices])

@app.route('/api/devices', methods=['POST'])
def add_device():
    data = request.json
    new_device = Device(
        project=data.get('project', ''),
        name=data['name'],
        unit=data.get('unit', ''),
        department=data.get('department', ''),
        description=data.get('description', ''),
        status=data.get('status', '待处理')
    )
    db.session.add(new_device)
    db.session.commit()
    return jsonify(new_device.to_dict()), 201

@app.route('/api/devices/<int:device_id>', methods=['PUT'])
def update_device(device_id):
    device = Device.query.get_or_404(device_id)
    data = request.json
    
    device.project = data.get('project', device.project)
    device.name = data.get('name', device.name)
    device.unit = data.get('unit', device.unit)
    device.department = data.get('department', device.department)
    device.description = data.get('description', device.description)
    device.status = data.get('status', device.status)
    device.last_updated = datetime.utcnow()
    
    db.session.commit()
    return jsonify(device.to_dict())

@app.route('/api/devices/<int:device_id>', methods=['DELETE'])
def delete_device(device_id):
    device = Device.query.get_or_404(device_id)
    db.session.delete(device)
    db.session.commit()
    return '', 204

@app.route('/api/export/csv', methods=['GET'])
def export_csv():
    status_filter = request.args.get('status', None)
    
    if status_filter and status_filter != 'all':
        devices = Device.query.filter_by(status=status_filter).all()
    else:
        devices = Device.query.all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow(['ID', '维护项目', '设备名称', '用户', '部门', '描述', '状态', '最后更新时间'])
    
    # Convert UTC time to Malaysia time for CSV export
    malaysia_tz = pytz.timezone('Asia/Kuala_Lumpur')
    
    # Write data
    for device in devices:
        # Convert time to Malaysia timezone
        utc_time = pytz.utc.localize(device.last_updated)
        malaysia_time = utc_time.astimezone(malaysia_tz)
        formatted_time = malaysia_time.strftime('%d/%m/%Y %I:%M %p')
        
        writer.writerow([
            device.id,
            device.project or '',
            device.name,
            device.unit or '',
            device.department or '',
            device.description or '',
            device.status,
            formatted_time
        ])
    
    output.seek(0)
    
    return send_file(
        io.BytesIO(output.getvalue().encode('utf-8-sig')),
        mimetype='text/csv',
        as_attachment=True,
        download_name='devices.csv'
    )

@app.route('/api/export/excel', methods=['GET'])
def export_excel():
    # For now, just redirect to CSV export since we don't have pandas/xlsxwriter
    return redirect(url_for('export_csv'))

if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True)
