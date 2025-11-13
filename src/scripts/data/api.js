import CONFIG from '../config';

const ENDPOINTS = {
  REGISTER: `${CONFIG.BASE_URL}/register`,
  LOGIN: `${CONFIG.BASE_URL}/login`,
  STORIES: `${CONFIG.BASE_URL}/stories`,
  STORIES_GUEST: `${CONFIG.BASE_URL}/stories/guest`,
  STORY_DETAIL: (id) => `${CONFIG.BASE_URL}/stories/${id}`,
};

// Helper function untuk mendapatkan token dari localStorage
function getAuthToken() {
  return localStorage.getItem('authToken');
}

// Register user
export async function registerUser({ name, email, password }) {
  const response = await fetch(ENDPOINTS.REGISTER, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, email, password }),
  });
  return await response.json();
}

// Login user
export async function loginUser({ email, password }) {
  const response = await fetch(ENDPOINTS.LOGIN, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });
  return await response.json();
}

// Get all stories
export async function getAllStories({ page = 1, size = 10, location = 0 } = {}) {
  const token = getAuthToken();
  const url = new URL(ENDPOINTS.STORIES);
  url.searchParams.append('page', page);
  url.searchParams.append('size', size);
  url.searchParams.append('location', location);

  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers,
  });
  return await response.json();
}

// Get story detail
export async function getStoryDetail(id) {
  const token = getAuthToken();
  const headers = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(ENDPOINTS.STORY_DETAIL(id), {
    method: 'GET',
    headers,
  });
  return await response.json();
}

// Add new story (authenticated)
export async function addStory(formData) {
  const token = getAuthToken();
  if (!token) {
    throw new Error('Authentication required');
  }

  const response = await fetch(ENDPOINTS.STORIES, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });
  return await response.json();
}

// Add new story (guest)
export async function addStoryGuest(formData) {
  const response = await fetch(ENDPOINTS.STORIES_GUEST, {
    method: 'POST',
    body: formData,
  });
  return await response.json();
}