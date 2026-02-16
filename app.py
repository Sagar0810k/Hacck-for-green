from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import os
import random
import time
from werkzeug.utils import secure_filename
from threading import Thread
from collections import deque

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# Configuration
UPLOAD_FOLDER = 'static/uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max

# Frame history storage (last 100 frames)
frame_history = deque(maxlen=100)
streaming_active = False

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def generate_mock_frame_data(frame_id):
    """Generate mock analysis data for streaming frames"""
    data = {
        'frame_id': frame_id,
        'timestamp': time.time(),
        'segmentation_confidence': round(random.uniform(85, 99), 2),
        'hazard_level': random.choice(['Low', 'Medium', 'High']),
        'vegetation_score': round(random.uniform(20, 95), 2),
        'moisture_level': round(random.uniform(10, 90), 2),
        'terrain_roughness': round(random.uniform(15, 85), 2),
        'recommended_speed': random.randint(15, 60)
    }
    
    # Generate alerts for high hazard or low confidence
    alerts = []
    if data['hazard_level'] == 'High':
        alerts.append({'type': 'danger', 'message': 'High hazard detected!'})
    if data['segmentation_confidence'] < 90:
        alerts.append({'type': 'warning', 'message': 'Low confidence detection'})
    if data['terrain_roughness'] > 70:
        alerts.append({'type': 'warning', 'message': 'Rough terrain ahead'})
    
    data['alerts'] = alerts
    return data

def stream_frames():
    """Background thread for streaming frame updates"""
    global streaming_active
    frame_id = 0
    
    while streaming_active:
        frame_data = generate_mock_frame_data(frame_id)
        frame_history.append(frame_data)
        
        socketio.emit('frame_update', frame_data)
        frame_id += 1
        time.sleep(0.5)  # 0.5 second updates

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/static/<path:path>')
def serve_static(path):
    return send_from_directory('static', path)

@app.route('/api/analyze', methods=['POST'])
def analyze_image():
    # Check if image file is present
    if 'image' not in request.files:
        return jsonify({'error': 'No image file provided'}), 400
    
    file = request.files['image']
    
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if not allowed_file(file.filename):
        return jsonify({'error': 'Invalid file type'}), 400
    
    # Save the uploaded image
    filename = secure_filename(file.filename)
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(filepath)
    
    # Generate mock analysis data
    analysis_data = {
        'success': True,
        'image_url': f'/static/uploads/{filename}',
        'analysis': {
            'segmentation_confidence': round(random.uniform(85, 99), 2),
            'hazard_level': random.choice(['Low', 'Medium', 'High']),
            'vegetation_score': round(random.uniform(20, 95), 2),
            'moisture_level': round(random.uniform(10, 90), 2),
            'terrain_roughness': round(random.uniform(15, 85), 2),
            'recommended_speed': random.randint(15, 60),
            'environmental_metrics': {
                'soil_quality': round(random.uniform(40, 95), 2),
                'erosion_risk': round(random.uniform(5, 70), 2),
                'biodiversity_index': round(random.uniform(30, 90), 2),
                'water_presence': round(random.uniform(0, 80), 2)
            }
        }
    }
    
    return jsonify(analysis_data)

@app.route('/api/history', methods=['GET'])
def get_history():
    """Get frame history"""
    return jsonify({'frames': list(frame_history)})

@socketio.on('connect')
def handle_connect():
    print('Client connected')
    emit('connection_response', {'status': 'connected'})

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')

@socketio.on('start_streaming')
def handle_start_streaming():
    global streaming_active
    print('Received start_streaming event')
    if not streaming_active:
        streaming_active = True
        thread = Thread(target=stream_frames)
        thread.daemon = True
        thread.start()
        print('Streaming started')
        emit('streaming_status', {'status': 'started'}, broadcast=True)
    else:
        print('Streaming already active')
        emit('streaming_status', {'status': 'started'})

@socketio.on('stop_streaming')
def handle_stop_streaming():
    global streaming_active
    print('Received stop_streaming event')
    streaming_active = False
    print('Streaming stopped')
    emit('streaming_status', {'status': 'stopped'}, broadcast=True)

if __name__ == '__main__':
    socketio.run(app, debug=True, port=5000, allow_unsafe_werkzeug=True)
