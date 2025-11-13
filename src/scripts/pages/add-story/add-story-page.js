import { addStory, addStoryGuest } from '../../data/api';
import { addStoryToDB } from '../../utils/indexeddb';

export default class AddStoryPage {
  constructor() {
    this.map = null;
    this.marker = null;
    this.selectedLat = null;
    this.selectedLon = null;
    this.mediaStream = null;
  }

  async render() {
    return `
      <a href="#main-content" class="skip-link">Skip to content</a>
      <section class="container add-story-section">
        <h1>Tambah Story Baru</h1>
        <p class="info-text">Anda dapat menambahkan story tanpa perlu login. Login hanya diperlukan untuk fitur tambahan.</p>
        
        <form id="add-story-form" class="add-story-form" novalidate>
          <div class="form-group">
            <label for="story-description">Deskripsi</label>
            <textarea 
              id="story-description" 
              name="description" 
              rows="4" 
              required 
              aria-required="true"
              aria-label="Deskripsi story"
            ></textarea>
            <span class="error-message" id="description-error" role="alert" aria-live="polite"></span>
          </div>

          <div class="form-group">
            <label for="story-photo">Foto</label>
            <div class="photo-input-group">
              <input 
                type="file" 
                id="story-photo" 
                name="photo" 
                accept="image/*" 
                required 
                aria-required="true"
                aria-label="Pilih foto atau ambil dari kamera"
              />
              <button 
                type="button" 
                id="camera-btn" 
                class="btn btn-secondary"
                aria-label="Ambil foto dari kamera"
                tabindex="0"
              >
                📷 Ambil dari Kamera
              </button>
            </div>
            <div id="photo-preview" class="photo-preview" role="img" aria-label="Preview foto"></div>
            <span class="error-message" id="photo-error" role="alert" aria-live="polite"></span>
          </div>

          <div class="form-group">
            <label for="map-select">Pilih Lokasi di Peta</label>
            <div id="map" class="map-selector" role="application" aria-label="Peta untuk memilih lokasi"></div>
            <p class="map-instruction">Klik pada peta untuk memilih lokasi (opsional)</p>
            <div id="location-info" class="location-info" aria-live="polite"></div>
          </div>

          <div class="form-actions">
            <button type="submit" class="btn btn-primary" aria-label="Kirim story">Kirim Story</button>
            <a href="#/" class="btn btn-secondary" aria-label="Batal dan kembali ke beranda">Batal</a>
          </div>
        </form>
      </section>
    `;
  }

  async afterRender() {
    this.initMap();
    this.setupEventListeners();
  }

  // Cleanup when leaving page
  cleanup() {
    this.closeCamera();
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }

  initMap() {
    if (typeof L === 'undefined') {
      console.error('Leaflet library not loaded');
      return;
    }

    // Initialize map
    this.map = L.map('map', {
      center: [-2.5489, 118.0149],
      zoom: 5,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(this.map);

    // Add click handler to select location
    this.map.on('click', (e) => {
      const { lat, lng } = e.latlng;
      this.selectLocation(lat, lng);
    });
  }

  selectLocation(lat, lon) {
    this.selectedLat = lat;
    this.selectedLon = lon;

    // Remove existing marker
    if (this.marker) {
      this.marker.remove();
    }

    // Add new marker
    this.marker = L.marker([lat, lon])
      .addTo(this.map)
      .bindPopup(`Lokasi dipilih: ${lat.toFixed(4)}, ${lon.toFixed(4)}`)
      .openPopup();

    // Update location info
    const locationInfo = document.getElementById('location-info');
    locationInfo.textContent = `Lokasi: ${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    locationInfo.setAttribute('aria-label', `Lokasi dipilih: ${lat.toFixed(4)}, ${lon.toFixed(4)}`);
  }

  setupEventListeners() {
    const form = document.getElementById('add-story-form');
    const photoInput = document.getElementById('story-photo');
    const cameraBtn = document.getElementById('camera-btn');
    const descriptionInput = document.getElementById('story-description');

    // Photo preview
    photoInput.addEventListener('change', (e) => {
      this.handlePhotoPreview(e.target.files[0]);
    });

    // Camera button
    cameraBtn.addEventListener('click', () => {
      this.openCamera();
    });

    // Description validation
    descriptionInput.addEventListener('blur', () => {
      this.validateDescription();
    });

    // Form submission
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (this.validateForm()) {
        await this.handleSubmit();
      }
    });
  }

  handlePhotoPreview(file) {
    const preview = document.getElementById('photo-preview');
    const errorElement = document.getElementById('photo-error');

    if (!file) {
      preview.innerHTML = '';
      return;
    }

    // Validate file size (max 1MB)
    if (file.size > 1024 * 1024) {
      this.showError(errorElement, 'Ukuran file maksimal 1MB');
      preview.innerHTML = '';
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      this.showError(errorElement, 'File harus berupa gambar');
      preview.innerHTML = '';
      return;
    }

    this.hideError(errorElement);

    const reader = new FileReader();
    reader.onload = (e) => {
      preview.innerHTML = `<img src="${e.target.result}" alt="Preview foto yang akan diupload" />`;
    };
    reader.readAsDataURL(file);
  }

  async openCamera() {
    try {
      // Request camera access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });

      // Create video element
      const preview = document.getElementById('photo-preview');
      preview.innerHTML = `
        <video id="camera-preview" autoplay playsinline aria-label="Preview kamera"></video>
        <div class="camera-controls">
          <button type="button" id="capture-btn" class="btn btn-primary" aria-label="Ambil foto dari kamera">Ambil Foto</button>
          <button type="button" id="cancel-camera-btn" class="btn btn-secondary" aria-label="Batal mengambil foto">Batal</button>
        </div>
      `;

      const video = document.getElementById('camera-preview');
      video.srcObject = this.mediaStream;

      // Setup capture button
      document.getElementById('capture-btn').addEventListener('click', () => {
        this.capturePhoto(video);
      });

      // Setup cancel button
      document.getElementById('cancel-camera-btn').addEventListener('click', () => {
        this.closeCamera();
      });
    } catch (error) {
      alert('Tidak dapat mengakses kamera. Pastikan Anda memberikan izin akses kamera.');
      console.error('Camera access error:', error);
    }
  }

  capturePhoto(video) {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);

    // Convert to blob
    canvas.toBlob((blob) => {
      const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' });
      
      // Update file input
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      document.getElementById('story-photo').files = dataTransfer.files;
      
      // Trigger change event
      document.getElementById('story-photo').dispatchEvent(new Event('change', { bubbles: true }));
      
      // Close camera
      this.closeCamera();
    }, 'image/jpeg', 0.9);
  }

  closeCamera() {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    const preview = document.getElementById('photo-preview');
    const video = preview.querySelector('video');
    if (video) {
      video.srcObject = null;
    }
  }

  validateDescription() {
    const descriptionInput = document.getElementById('story-description');
    const errorElement = document.getElementById('description-error');
    const description = descriptionInput.value.trim();

    if (!description) {
      this.showError(errorElement, 'Deskripsi harus diisi');
      return false;
    }
    this.hideError(errorElement);
    return true;
  }

  validatePhoto() {
    const photoInput = document.getElementById('story-photo');
    const errorElement = document.getElementById('photo-error');

    if (!photoInput.files || photoInput.files.length === 0) {
      this.showError(errorElement, 'Foto harus dipilih');
      return false;
    }

    const file = photoInput.files[0];
    if (file.size > 1024 * 1024) {
      this.showError(errorElement, 'Ukuran file maksimal 1MB');
      return false;
    }

    if (!file.type.startsWith('image/')) {
      this.showError(errorElement, 'File harus berupa gambar');
      return false;
    }

    this.hideError(errorElement);
    return true;
  }

  validateForm() {
    const isDescriptionValid = this.validateDescription();
    const isPhotoValid = this.validatePhoto();
    return isDescriptionValid && isPhotoValid;
  }

  async handleSubmit() {
    const form = document.getElementById('add-story-form');
    const submitButton = form.querySelector('button[type="submit"]');
    const descriptionInput = document.getElementById('story-description');
    const photoInput = document.getElementById('story-photo');

    submitButton.disabled = true;
    submitButton.textContent = 'Mengirim...';

    try {
      // Create FormData
      const formData = new FormData();
      formData.append('description', descriptionInput.value.trim());
      formData.append('photo', photoInput.files[0]);

      if (this.selectedLat && this.selectedLon) {
        formData.append('lat', this.selectedLat);
        formData.append('lon', this.selectedLon);
      }

      // Check if user is logged in
      const token = localStorage.getItem('authToken');
      let response;

      if (token) {
        // User logged in - use authenticated endpoint
        response = await addStory(formData);
      } else {
        // Guest user - use guest endpoint (tidak perlu login)
        response = await addStoryGuest(formData);
      }

      if (response.error === false) {
        alert('Story berhasil ditambahkan!');
        window.location.hash = '#/';
      } else {
        alert(response.message || 'Gagal menambahkan story');
      }
    } catch (error) {
      console.error('Error:', error);
      
      // If offline or network error, save to IndexedDB
      if (!navigator.onLine || error.message.includes('Failed to fetch')) {
        try {
          // Create story object for IndexedDB
          const storyData = {
            id: `offline-${Date.now()}`,
            name: descriptionInput.value.trim(),
            description: descriptionInput.value.trim(),
            photoUrl: URL.createObjectURL(photoInput.files[0]),
            createdAt: new Date().toISOString(),
            lat: this.selectedLat || null,
            lon: this.selectedLon || null,
            synced: false,
          };
          
          // Save photo as blob reference (we'll need to handle this differently)
          // For now, save the file reference
          await addStoryToDB(storyData);
          
          alert('Story disimpan secara offline. Akan disinkronkan saat koneksi tersedia.');
          window.location.hash = '#/favorites';
        } catch (dbError) {
          console.error('Error saving to IndexedDB:', dbError);
          alert('Terjadi kesalahan saat menyimpan story. Silakan coba lagi.');
        }
      } else {
        alert('Terjadi kesalahan saat mengirim story. Silakan coba lagi.');
      }
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = 'Kirim Story';
    }
  }

  showError(element, message) {
    element.textContent = message;
    element.style.display = 'block';
  }

  hideError(element) {
    element.textContent = '';
    element.style.display = 'none';
  }
}

