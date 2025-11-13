import {
  getAllStoriesFromDB,
  deleteStoryFromDB,
  searchStoriesFromDB,
  sortStoriesFromDB,
  getUnsyncedStories,
  updateStoryInDB,
} from '../../utils/indexeddb';
import { showFormattedDate } from '../../utils/index';
import { addStory } from '../../data/api';

export default class FavoritesPage {
  constructor() {
    this.stories = [];
    this.filteredStories = [];
    this.currentSort = { field: 'createdAt', order: 'desc' };
    this.currentSearch = '';
  }

  async render() {
    return `
      <a href="#main-content" class="skip-link">Skip to content</a>
      <section class="container favorites-section">
        <h1>Story Favorit Saya</h1>
        <p class="info-text">Kelola story yang Anda simpan secara offline. Story yang ditambahkan saat offline akan disinkronkan saat koneksi tersedia.</p>
        
        <div class="favorites-controls">
          <div class="search-box">
            <label for="search-input" class="sr-only">Cari story</label>
            <input 
              type="text" 
              id="search-input" 
              class="search-input" 
              placeholder="Cari story..."
              aria-label="Cari story berdasarkan nama atau deskripsi"
            />
          </div>
          
          <div class="sort-controls">
            <label for="sort-field">Urutkan berdasarkan:</label>
            <select id="sort-field" class="sort-select" aria-label="Pilih field untuk sorting">
              <option value="createdAt">Tanggal</option>
              <option value="name">Nama</option>
              <option value="description">Deskripsi</option>
            </select>
            
            <select id="sort-order" class="sort-select" aria-label="Pilih urutan sorting">
              <option value="desc">Terbaru</option>
              <option value="asc">Terlama</option>
            </select>
          </div>
          
          <button id="sync-btn" class="btn btn-primary" aria-label="Sinkronkan story offline">
            🔄 Sinkronkan
          </button>
        </div>

        <div id="sync-status" class="sync-status" role="status" aria-live="polite"></div>

        <div id="favorites-list" class="favorites-list" role="list">
          <p class="loading-text">Memuat story favorit...</p>
        </div>
      </section>
    `;
  }

  async afterRender() {
    await this.loadStories();
    this.setupEventListeners();
    this.checkSyncStatus();
  }

  cleanup() {
    // Cleanup jika diperlukan
  }

  async loadStories() {
    const favoritesList = document.getElementById('favorites-list');
    favoritesList.innerHTML = '<p class="loading-text">Memuat story favorit...</p>';

    try {
      this.stories = await getAllStoriesFromDB();
      this.applyFilters();
    } catch (error) {
      console.error('Error loading stories:', error);
      favoritesList.innerHTML = '<p class="error-text">Gagal memuat story favorit</p>';
    }
  }

  applyFilters() {
    let filtered = [...this.stories];

    // Apply search
    if (this.currentSearch) {
      filtered = filtered.filter(
        (story) =>
          story.name?.toLowerCase().includes(this.currentSearch.toLowerCase()) ||
          story.description?.toLowerCase().includes(this.currentSearch.toLowerCase())
      );
    }

    // Apply sort
    filtered.sort((a, b) => {
      let aVal = a[this.currentSort.field];
      let bVal = b[this.currentSort.field];

      if (this.currentSort.field === 'createdAt') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      } else if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (this.currentSort.order === 'asc') {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });

    this.filteredStories = filtered;
    this.renderStoriesList();
  }

  renderStoriesList() {
    const favoritesList = document.getElementById('favorites-list');

    if (this.filteredStories.length === 0) {
      favoritesList.innerHTML = '<p>Tidak ada story favorit untuk ditampilkan</p>';
      return;
    }

    favoritesList.innerHTML = this.filteredStories
      .map((story) => {
        const syncBadge = story.synced === false ? '<span class="sync-badge" aria-label="Belum disinkronkan">⏳ Offline</span>' : '';
        return `
          <article 
            class="favorite-card" 
            data-story-id="${story.id}"
            role="listitem"
          >
            <img 
              src="${story.photoUrl}" 
              alt="${story.description || 'Foto story'}" 
              class="favorite-photo"
              loading="lazy"
            />
            <div class="favorite-content">
              <h3>${story.name}</h3>
              <p>${story.description}</p>
              <time datetime="${story.createdAt}">
                ${showFormattedDate(story.createdAt, 'id-ID')}
              </time>
              ${syncBadge}
            </div>
            <button 
              class="delete-btn" 
              data-story-id="${story.id}"
              aria-label="Hapus story dari favorit"
              title="Hapus"
            >
              🗑️
            </button>
          </article>
        `;
      })
      .join('');

    // Add delete button handlers
    favoritesList.querySelectorAll('.delete-btn').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const storyId = btn.dataset.storyId;
        if (confirm('Apakah Anda yakin ingin menghapus story ini dari favorit?')) {
          await this.deleteStory(storyId);
        }
      });
    });
  }

  async deleteStory(id) {
    try {
      const success = await deleteStoryFromDB(id);
      if (success) {
        this.stories = this.stories.filter((story) => story.id !== id);
        this.applyFilters();
      } else {
        alert('Gagal menghapus story');
      }
    } catch (error) {
      console.error('Error deleting story:', error);
      alert('Terjadi kesalahan saat menghapus story');
    }
  }

  async syncStories() {
    const syncBtn = document.getElementById('sync-btn');
    const syncStatus = document.getElementById('sync-status');
    
    syncBtn.disabled = true;
    syncBtn.textContent = 'Menyinkronkan...';
    syncStatus.textContent = 'Menyinkronkan story offline...';
    syncStatus.className = 'sync-status syncing';

    try {
      const unsyncedStories = await getUnsyncedStories();
      
      if (unsyncedStories.length === 0) {
        syncStatus.textContent = 'Semua story sudah tersinkronkan';
        syncStatus.className = 'sync-status success';
        syncBtn.disabled = false;
        syncBtn.textContent = '🔄 Sinkronkan';
        return;
      }

      let successCount = 0;
      let failCount = 0;

      for (const story of unsyncedStories) {
        try {
          // Create FormData for story
          const formData = new FormData();
          formData.append('description', story.description);
          
          // Convert photoUrl to blob if needed
          if (story.photoUrl) {
            const response = await fetch(story.photoUrl);
            const blob = await response.blob();
            formData.append('photo', blob, 'photo.jpg');
          }

          if (story.lat && story.lon) {
            formData.append('lat', story.lat);
            formData.append('lon', story.lon);
          }

          const result = await addStory(formData);
          
          if (result.error === false) {
            // Mark as synced
            story.synced = true;
            await updateStoryInDB(story);
            successCount++;
          } else {
            failCount++;
          }
        } catch (error) {
          console.error('Error syncing story:', error);
          failCount++;
        }
      }

      syncStatus.textContent = `Sinkronisasi selesai: ${successCount} berhasil, ${failCount} gagal`;
      syncStatus.className = failCount > 0 ? 'sync-status warning' : 'sync-status success';
      
      // Reload stories
      await this.loadStories();
    } catch (error) {
      console.error('Error syncing stories:', error);
      syncStatus.textContent = 'Gagal menyinkronkan story';
      syncStatus.className = 'sync-status error';
    } finally {
      syncBtn.disabled = false;
      syncBtn.textContent = '🔄 Sinkronkan';
    }
  }

  async checkSyncStatus() {
    const unsyncedStories = await getUnsyncedStories();
    const syncStatus = document.getElementById('sync-status');
    
    if (unsyncedStories.length > 0) {
      syncStatus.textContent = `Ada ${unsyncedStories.length} story yang belum disinkronkan`;
      syncStatus.className = 'sync-status warning';
    } else {
      syncStatus.textContent = '';
      syncStatus.className = 'sync-status';
    }
  }

  setupEventListeners() {
    // Search input
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', (e) => {
      this.currentSearch = e.target.value;
      this.applyFilters();
    });

    // Sort controls
    const sortField = document.getElementById('sort-field');
    const sortOrder = document.getElementById('sort-order');

    sortField.addEventListener('change', (e) => {
      this.currentSort.field = e.target.value;
      this.applyFilters();
    });

    sortOrder.addEventListener('change', (e) => {
      this.currentSort.order = e.target.value;
      this.applyFilters();
    });

    // Sync button
    const syncBtn = document.getElementById('sync-btn');
    syncBtn.addEventListener('click', () => {
      this.syncStories();
    });

    // Check online status
    window.addEventListener('online', () => {
      this.checkSyncStatus();
    });
  }
}

