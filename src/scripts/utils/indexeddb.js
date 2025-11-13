// IndexedDB Utility untuk menyimpan stories
import { openDB } from 'idb';

const DB_NAME = 'DicodingStoriesDB';
const DB_VERSION = 1;
const STORE_NAME = 'stories';

// Initialize database
async function initDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('name', 'name', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('description', 'description', { unique: false });
      }
    },
  });
}

// Create - Add story to IndexedDB
export async function addStoryToDB(story) {
  try {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    
    // Add sync flag for offline stories
    const storyWithSync = {
      ...story,
      synced: false,
      createdAtDB: new Date().toISOString(),
    };
    
    await store.add(storyWithSync);
    await tx.done;
    console.log('Story added to IndexedDB:', story.id);
    return true;
  } catch (error) {
    console.error('Error adding story to IndexedDB:', error);
    return false;
  }
}

// Read - Get all stories from IndexedDB
export async function getAllStoriesFromDB() {
  try {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const stories = await store.getAll();
    await tx.done;
    return stories;
  } catch (error) {
    console.error('Error getting stories from IndexedDB:', error);
    return [];
  }
}

// Read - Get single story by ID
export async function getStoryFromDB(id) {
  try {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const story = await store.get(id);
    await tx.done;
    return story;
  } catch (error) {
    console.error('Error getting story from IndexedDB:', error);
    return null;
  }
}

// Delete - Remove story from IndexedDB
export async function deleteStoryFromDB(id) {
  try {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    await store.delete(id);
    await tx.done;
    console.log('Story deleted from IndexedDB:', id);
    return true;
  } catch (error) {
    console.error('Error deleting story from IndexedDB:', error);
    return false;
  }
}

// Update story in IndexedDB
export async function updateStoryInDB(story) {
  try {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    await store.put(story);
    await tx.done;
    return true;
  } catch (error) {
    console.error('Error updating story in IndexedDB:', error);
    return false;
  }
}

// Filter stories
export async function filterStoriesFromDB(filterFn) {
  try {
    const stories = await getAllStoriesFromDB();
    return stories.filter(filterFn);
  } catch (error) {
    console.error('Error filtering stories from IndexedDB:', error);
    return [];
  }
}

// Search stories by keyword
export async function searchStoriesFromDB(keyword) {
  try {
    const stories = await getAllStoriesFromDB();
    const lowerKeyword = keyword.toLowerCase();
    return stories.filter(
      (story) =>
        story.name?.toLowerCase().includes(lowerKeyword) ||
        story.description?.toLowerCase().includes(lowerKeyword)
    );
  } catch (error) {
    console.error('Error searching stories from IndexedDB:', error);
    return [];
  }
}

// Sort stories
export async function sortStoriesFromDB(sortBy = 'createdAt', order = 'desc') {
  try {
    const stories = await getAllStoriesFromDB();
    return stories.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];

      if (sortBy === 'createdAt') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      } else if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (order === 'asc') {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });
  } catch (error) {
    console.error('Error sorting stories from IndexedDB:', error);
    return [];
  }
}

// Get unsynced stories (for offline sync)
export async function getUnsyncedStories() {
  try {
    const stories = await getAllStoriesFromDB();
    return stories.filter((story) => story.synced === false);
  } catch (error) {
    console.error('Error getting unsynced stories:', error);
    return [];
  }
}

// Mark story as synced
export async function markStoryAsSynced(id) {
  try {
    const story = await getStoryFromDB(id);
    if (story) {
      story.synced = true;
      await updateStoryInDB(story);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error marking story as synced:', error);
    return false;
  }
}

// Clear all stories from IndexedDB
export async function clearAllStoriesFromDB() {
  try {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    await store.clear();
    await tx.done;
    return true;
  } catch (error) {
    console.error('Error clearing stories from IndexedDB:', error);
    return false;
  }
}

