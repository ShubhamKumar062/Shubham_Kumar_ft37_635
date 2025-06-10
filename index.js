const menuIcon = document.querySelector(".menu-icon");
const sidebar = document.querySelector(".sidebar");
const container = document.getElementById("videos-container");
const searchInput = document.getElementById("search-input");
const searchBtn = document.getElementById("search-btn");
const loading = document.getElementById("loading");
const navLinks = document.querySelectorAll(".nav-link");

// Toggle sidebar
menuIcon.onclick = () => sidebar.classList.toggle("small-sidebar");

// API Configuration
const API_KEY = "Api_key"; 
const BASE_URL = "https://www.googleapis.com/youtube/v3";
let nextPageToken = "";
let currentPage = "home";

// Initialize the app
document.addEventListener("DOMContentLoaded", () => {
  fetchPopularVideos();
  setupEventListeners();
});

function setupEventListeners() {
  // Search functionality
  searchBtn.addEventListener("click", searchVideos);
  
  // Search on Enter key
  searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") searchVideos();
  });
  
  // Navigation links
  navLinks.forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      navLinks.forEach(l => l.classList.remove("active"));
      link.classList.add("active");
      
      currentPage = link.dataset.page;
      container.innerHTML = "";
      nextPageToken = "";
      
      if (currentPage === "home") fetchPopularVideos();
      else if (currentPage === "trending") fetchTrendingVideos();
      else if (currentPage === "subscriptions") fetchSubscribedVideos();
    });
  });
  
  // Infinite scroll
  window.addEventListener("scroll", () => {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
      loadMoreVideos();
    }
  });
}

// Fetch popular videos
async function fetchPopularVideos() {
  showLoading();
  try {
    const url = `${BASE_URL}/videos?part=snippet,statistics,contentDetails&chart=mostPopular&maxResults=12&regionCode=US&key=${API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    displayVideos(data.items);
    nextPageToken = data.nextPageToken || "";
  } catch (error) {
    showError("Error fetching videos. Please try again later.");
  } finally {
    hideLoading();
  }
}

// Fetch trending videos
async function fetchTrendingVideos() {
  showLoading();
  try {
    const url = `${BASE_URL}/videos?part=snippet,statistics,contentDetails&chart=mostPopular&maxResults=12&regionCode=US&videoCategoryId=10&key=${API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    displayVideos(data.items);
    nextPageToken = data.nextPageToken || "";
  } catch (error) {
    showError("Error fetching trending videos.");
  } finally {
    hideLoading();
  }
}

// Search videos
async function searchVideos() {
  const query = searchInput.value.trim();
  if (!query) return;
  
  showLoading();
  container.innerHTML = "";
  
  try {
    const searchUrl = `${BASE_URL}/search?part=snippet&type=video&maxResults=12&q=${encodeURIComponent(query)}&key=${API_KEY}`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();
    
    const videoIds = searchData.items.map(item => item.id.videoId).join(",");
    const videosUrl = `${BASE_URL}/videos?part=snippet,statistics,contentDetails&id=${videoIds}&key=${API_KEY}`;
    const videosRes = await fetch(videosUrl);
    const videosData = await videosRes.json();
    
    displayVideos(videosData.items);
    nextPageToken = searchData.nextPageToken || "";
  } catch (error) {
    showError("Error searching videos. Please try again.");
  } finally {
    hideLoading();
  }
}

// Display videos
function displayVideos(videos) {
  if (!videos || videos.length === 0) {
    container.innerHTML = `<p class="no-results">No videos found. Try a different search.</p>`;
    return;
  }
  
  videos.forEach(video => {
    const videoId = video.id;
    const snippet = video.snippet;
    const stats = video.statistics;
    
    const card = document.createElement("div");
    card.classList.add("video-card");
    card.innerHTML = `
      <div class="thumbnail" data-video-id="${videoId}">
        <img src="${snippet.thumbnails.medium.url}" alt="${snippet.title}">
        <div class="duration">${getDuration(video.contentDetails.duration)}</div>
      </div>
      <div class="video-info">
        <div class="channel-icon">
          <img src="${snippet.thumbnails.default.url}" alt="${snippet.channelTitle}">
        </div>
        <div class="video-details">
          <h3>${snippet.title}</h3>
          <p class="channel-name">${snippet.channelTitle}</p>
          <p class="video-stats">${formatNumber(stats.viewCount)} views • ${getTimeSince(snippet.publishedAt)}</p>
        </div>
      </div>
    `;
    
    container.appendChild(card);
  });
  
  // Add click event to thumbnails
  document.querySelectorAll('.thumbnail').forEach(thumb => {
    thumb.addEventListener('click', function() {
      const videoId = this.dataset.videoId;
      playVideo(videoId);
    });
  });
}

// Play video in iframe
function playVideo(videoId) {
  const player = document.createElement("div");
  player.classList.add("video-player");
  player.innerHTML = `
    <div class="player-container">
      <iframe 
        width="100%" 
        height="450" 
        src="https://www.youtube.com/embed/${videoId}?autoplay=1" 
        frameborder="0" 
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
        allowfullscreen>
      </iframe>
      <button class="close-player"><i class="fas fa-times"></i></button>
    </div>
  `;
  
  document.body.appendChild(player);
  
  // Close player
  document.querySelector(".close-player").addEventListener("click", () => {
    player.remove();
  });
}

// Helper functions
function formatNumber(num) {
  return parseInt(num).toLocaleString();
}

function getTimeSince(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hours ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays} days ago`;
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) return `${diffInMonths} months ago`;
  const diffInYears = Math.floor(diffInMonths / 12);
  return `${diffInYears} years ago`;
}

function getDuration(duration) {
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  const hours = parseInt(match[1]) || 0;
  const minutes = parseInt(match[2]) || 0;
  const seconds = parseInt(match[3]) || 0;
  
  return hours 
    ? `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    : `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function showLoading() {
  loading.style.display = "flex";
}

function hideLoading() {
  loading.style.display = "none";
}

function showError(message) {
  container.innerHTML = `<p class="error">${message}</p>`;
}