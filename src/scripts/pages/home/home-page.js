import { getAllStories } from '../../data/api';
import { showFormattedDate } from '../../utils/index';
import { enablePushNotifications, disablePushNotifications, isPushNotificationEnabled } from '../../utils/push-notification';
import { addStoryToDB, getStoryFromDB, deleteStoryFromDB } from '../../utils/indexeddb';

export default class HomePage {
  constructor() {
    this.stories = [];
    this.map = null;
    this.markers = [];
    this.selectedStoryId = null;
  }

  async render() {
    return `
      <a href="#main-content" class="skip-link">Skip to content</a>
      <section class="container home-section">
        <h1>Dicoding Stories</h1>
        <p class="welcome-text">Selamat datang! Anda dapat melihat dan menambahkan stories tanpa perlu login. Login hanya untuk fitur tambahan.</p>
        
        <div class="stories-controls">
          <button id="filter-location-btn" class="btn btn-secondary" aria-label="Filter stories dengan lokasi" type="button">
            Tampilkan dengan Lokasi
          </button>
          <a href="#/add-story" class="btn btn-primary" aria-label="Tambah story baru">Tambah Story</a>
          <a href="#/favorites" class="btn btn-secondary" aria-label="Lihat story favorit">⭐ Favorit</a>
          <button id="push-toggle-btn" class="btn btn-secondary" aria-label="Toggle push notification" type="button">
            🔔 Notifikasi
          </button>
        </div>

        <div class="stories-layout">
          <div class="stories-list-container">
            <h2>Daftar Stories</h2>
            <div id="stories-list" class="stories-list" role="list">
              <p class="loading-text">Memuat stories...</p>
            </div>
          </div>

          <div class="map-container">
            <h2>Peta Lokasi</h2>
            <div id="map" class="map" role="application" aria-label="Peta digital menampilkan lokasi stories"></div>
            <div class="map-controls">
              <label for="tile-layer-select" class="sr-only">Pilih layer peta</label>
              <select id="tile-layer-select" class="tile-layer-select" aria-label="Pilih layer peta">
                <option value="osm">OpenStreetMap</option>
                <option value="satellite">Satelit</option>
                <option value="terrain">Terrain</option>
              </select>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  async afterRender() {
    await this.loadStories();
    this.initMap();
    this.setupEventListeners();
    this.setupPushNotificationToggle();
  }

  // Cleanup when leaving page
  cleanup() {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
    this.markers = [];
  }

  async loadStories(showLocation = false) {
    const storiesList = document.getElementById('stories-list');
    storiesList.innerHTML = '<p class="loading-text">Memuat stories...</p>';

    try {
      const response = await getAllStories({ 
        page: 1, 
        size: 100, 
        location: showLocation ? 1 : 0 
      });

      if (response.error === false && response.listStory) {
        this.stories = response.listStory;
        this.renderStoriesList();
        this.updateMap();
      } else {
        storiesList.innerHTML = '<p class="error-text">Gagal memuat stories</p>';
      }
    } catch (error) {
      storiesList.innerHTML = '<p class="error-text">Terjadi kesalahan saat memuat stories</p>';
    }
  }

  renderStoriesList() {
    const storiesList = document.getElementById('stories-list');
    
    if (this.stories.length === 0) {
      storiesList.innerHTML = '<p>Tidak ada story untuk ditampilkan</p>';
      return;
    }

    storiesList.innerHTML = this.stories
      .map((story) => {
        const hasLocation = story.lat && story.lon;
        return `
          <article 
            class="story-card ${this.selectedStoryId === story.id ? 'active' : ''}" 
            data-story-id="${story.id}"
            role="listitem"
            tabindex="0"
            aria-label="Story oleh ${story.name}"
          >
            <img 
              src="${story.photoUrl}" 
              alt="${story.description || 'Foto story'}" 
              class="story-photo"
              loading="lazy"
            />
            <div class="story-content">
              <h3>${story.name}</h3>
              <p>${story.description}</p>
              <time datetime="${story.createdAt}">
                ${showFormattedDate(story.createdAt, 'id-ID')}
              </time>
              ${hasLocation ? '<span class="location-badge" aria-label="Memiliki lokasi">📍</span>' : ''}
              <button 
                class="save-favorite-btn" 
                data-story-id="${story.id}"
                aria-label="Simpan ke favorit"
                title="Simpan ke favorit"
              >
                ⭐ Simpan
              </button>
            </div>
          </article>
        `;
      })
      .join('');

    // Add click handlers
    storiesList.querySelectorAll('.story-card').forEach((card) => {
      card.addEventListener('click', (e) => {
        // Don't trigger if clicking save button
        if (e.target.classList.contains('save-favorite-btn')) {
          return;
        }
        const storyId = card.dataset.storyId;
        this.selectStory(storyId);
      });

      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const storyId = card.dataset.storyId;
          this.selectStory(storyId);
        }
      });
    });

    // Add save to favorites handlers
    storiesList.querySelectorAll('.save-favorite-btn').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const storyId = btn.dataset.storyId;
        await this.saveToFavorites(storyId, btn);
      });
    });
  }

  initMap() {
    // Initialize map dengan Leaflet
    if (typeof L === 'undefined') {
      console.error('Leaflet library not loaded');
      return;
    }

    // Default center ke Indonesia
    this.map = L.map('map', {
      center: [-2.5489, 118.0149],
      zoom: 5,
    });

    // Add default tile layer
    this.tileLayers = {
      osm: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }),
      satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '© Esri',
      }),
      terrain: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenTopoMap contributors',
      }),
    };

    // Add default layer
    this.tileLayers.osm.addTo(this.map);
    this.currentLayer = 'osm';
  }

  updateMap() {
    if (!this.map) return;

    // Clear existing markers
    this.markers.forEach((marker) => marker.remove());
    this.markers = [];

    // Add markers for stories with location
    this.stories.forEach((story) => {
      if (story.lat && story.lon) {
        const marker = L.marker([story.lat, story.lon])
          .addTo(this.map)
          .bindPopup(`
            <div class="map-popup">
              <img src="${story.photoUrl}" alt="${story.description || 'Foto story'}" />
              <h3>${story.name}</h3>
              <p>${story.description}</p>
            </div>
          `);

        // Highlight marker when story is selected
        if (this.selectedStoryId === story.id) {
          marker.setIcon(
            L.icon({
              iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
              shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
              iconSize: [25, 41],
              iconAnchor: [12, 41],
              popupAnchor: [1, -34],
              shadowSize: [41, 41],
            })
          );
        }

        marker.on('click', () => {
          this.selectStory(story.id);
        });

        this.markers.push(marker);
      }
    });

    // Fit map to show all markers
    if (this.markers.length > 0) {
      const group = new L.featureGroup(this.markers);
      this.map.fitBounds(group.getBounds().pad(0.1));
    }
  }

  selectStory(storyId) {
    this.selectedStoryId = storyId;
    this.renderStoriesList();

    // Scroll to selected story
    const selectedCard = document.querySelector(`[data-story-id="${storyId}"]`);
    if (selectedCard) {
      selectedCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Highlight marker
    this.updateMap();
  }

  setupEventListeners() {
    const filterBtn = document.getElementById('filter-location-btn');
    if (filterBtn) {
      filterBtn.addEventListener('click', async () => {
        const showLocation = filterBtn.textContent.includes('Tampilkan');
        await this.loadStories(showLocation);
        filterBtn.textContent = showLocation 
          ? 'Tampilkan Semua' 
          : 'Tampilkan dengan Lokasi';
      });
    }

    const tileLayerSelect = document.getElementById('tile-layer-select');
    if (tileLayerSelect) {
      tileLayerSelect.addEventListener('change', (e) => {
        const newLayer = e.target.value;
        if (this.currentLayer !== newLayer) {
          this.map.removeLayer(this.tileLayers[this.currentLayer]);
          this.tileLayers[newLayer].addTo(this.map);
          this.currentLayer = newLayer;
        }
      });
    }
  }

  async setupPushNotificationToggle() {
    const pushToggleBtn = document.getElementById('push-toggle-btn');
    if (!pushToggleBtn) return;

    const isEnabled = await isPushNotificationEnabled();
    this.updatePushToggleButton(isEnabled);

    pushToggleBtn.addEventListener('click', async () => {
      const currentState = await isPushNotificationEnabled();
      if (currentState) {
        const disabled = await disablePushNotifications();
        this.updatePushToggleButton(!disabled);
      } else {
        const result = await enablePushNotifications();
        if (result.success) {
          this.updatePushToggleButton(true);
          alert('Push notification diaktifkan!');
        } else {
          alert(result.message || 'Gagal mengaktifkan push notification');
        }
      }
    });
  }

  updatePushToggleButton(isEnabled) {
    const pushToggleBtn = document.getElementById('push-toggle-btn');
    if (pushToggleBtn) {
      pushToggleBtn.textContent = isEnabled ? '🔔 Notifikasi Aktif' : '🔕 Notifikasi Mati';
      pushToggleBtn.setAttribute('aria-label', isEnabled ? 'Nonaktifkan push notification' : 'Aktifkan push notification');
    }
  }

  async saveToFavorites(storyId, button) {
    try {
      // Check if already saved
      const existingStory = await getStoryFromDB(storyId);
      if (existingStory) {
        // Already saved, remove it
        await deleteStoryFromDB(storyId);
        button.textContent = '⭐ Simpan';
        button.setAttribute('aria-label', 'Simpan ke favorit');
        alert('Story dihapus dari favorit');
      } else {
        // Find story in current list
        const story = this.stories.find((s) => s.id === storyId);
        if (story) {
          await addStoryToDB(story);
          button.textContent = '✅ Tersimpan';
          button.setAttribute('aria-label', 'Hapus dari favorit');
          alert('Story disimpan ke favorit!');
        }
      }
    } catch (error) {
      console.error('Error saving to favorites:', error);
      alert('Gagal menyimpan story ke favorit');
    }
  }
}
