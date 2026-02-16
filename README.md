# TerraVision AI - Image Analysis Dashboard

A professional full-stack web application for terrain image analysis with AI-powered environmental metrics visualization.

## 📁 Folder Structure

```
hackforgreen2/
│
├── app.py                      # Flask backend server
├── requirements.txt            # Python dependencies
├── index.html                  # Main HTML file
│
├── static/
│   ├── style.css              # CSS styling
│   ├── script.js              # JavaScript logic
│   └── uploads/               # Uploaded images storage
│
└── README.md                  # This file
```

## 🚀 Setup Instructions

### Prerequisites
- Python 3.8 or higher
- pip (Python package manager)

### Installation Steps

1. **Navigate to project directory**
   ```bash
   cd c:\Users\Lenovo\OneDrive\Desktop\hackforgreen2
   ```

2. **Install Python dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the Flask backend**
   ```bash
   python app.py
   ```
   
   The server will start at `http://localhost:5000`

4. **Open the application**
   - Open your web browser
   - Navigate to `http://localhost:5000`
   - The dashboard will load automatically

## 💡 Usage

1. **Upload Image**
   - Drag and drop an image onto the upload zone, OR
   - Click "Browse Files" to select an image from your computer
   - Supported formats: PNG, JPG, JPEG, GIF, WEBP (Max 16MB)

2. **Preview**
   - After selecting an image, a preview will appear
   - Click "Analyze Image" button to start processing

3. **View Results**
   - Analysis results will display with:
     - Segmentation Confidence
     - Hazard Level (Low/Medium/High)
     - Vegetation Score
     - Moisture Level
     - Terrain Roughness (with animated progress bar)
     - Recommended Speed
     - Environmental Metrics Chart (Soil Quality, Erosion Risk, Biodiversity, Water Presence)

## 🎨 Features

### Backend (Flask)
- ✅ Minimal, clean, modular architecture
- ✅ Image upload endpoint (`/api/analyze`)
- ✅ File validation and security (secure_filename)
- ✅ CORS enabled for cross-origin requests
- ✅ Mock data generation (no heavy ML processing)
- ✅ Static file serving

### Frontend
- ✅ Modern, professional dashboard design
- ✅ Drag-and-drop image upload
- ✅ Real-time image preview
- ✅ Animated loading spinner
- ✅ Responsive grid layout
- ✅ Metric cards with icons
- ✅ Animated progress bars
- ✅ Hazard level badges (color-coded)
- ✅ Chart.js visualization
- ✅ Smooth transitions and animations
- ✅ Mobile-responsive design
- ✅ Error handling

## 🛠️ Technology Stack

**Backend:**
- Flask 3.0.0
- Flask-CORS 4.0.0
- Werkzeug 3.0.1

**Frontend:**
- HTML5
- CSS3 (Modern Grid & Flexbox)
- Vanilla JavaScript (ES6+)
- Chart.js 4.4.0

## 📊 Mock Analysis Data

The backend generates random mock data for:
- Segmentation Confidence: 85-99%
- Hazard Level: Low, Medium, or High
- Vegetation Score: 20-95%
- Moisture Level: 10-90%
- Terrain Roughness: 15-85%
- Recommended Speed: 15-60 km/h
- Environmental Metrics:
  - Soil Quality: 40-95%
  - Erosion Risk: 5-70%
  - Biodiversity Index: 30-90%
  - Water Presence: 0-80%

## 🎯 Hackathon Ready

This application is designed for hackathon presentations with:
- Professional corporate-style UI
- Clean, maintainable code
- Clear separation of concerns
- Comprehensive documentation
- Easy setup and deployment
- Impressive visual design
- Smooth user experience

## 🔧 Troubleshooting

**Issue: Backend not starting**
- Ensure Python 3.8+ is installed
- Check if port 5000 is available
- Verify all dependencies are installed

**Issue: CORS errors**
- Ensure Flask-CORS is installed
- Check that backend is running on port 5000

**Issue: Image upload fails**
- Verify file size is under 16MB
- Check file format is supported
- Ensure `static/uploads/` directory exists

## 📝 License

This project is created for educational and hackathon purposes.

## 👥 Author

Created for HackForGreen2 Hackathon

---

**Enjoy using TerraVision AI! 🌍🚀**
