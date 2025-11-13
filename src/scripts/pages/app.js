import routes from '../routes/routes';
import { getActiveRoute } from '../routes/url-parser';

class App {
  #content = null;
  #drawerButton = null;
  #navigationDrawer = null;
  #currentUrl = null;

  constructor({ navigationDrawer, drawerButton, content }) {
    this.#content = content;
    this.#drawerButton = drawerButton;
    this.#navigationDrawer = navigationDrawer;

    this.#setupDrawer();
  }

  #setupDrawer() {
    this.#drawerButton.addEventListener('click', () => {
      const isOpen = this.#navigationDrawer.classList.toggle('open');
      this.#drawerButton.setAttribute('aria-expanded', isOpen);
    });

    document.body.addEventListener('click', (event) => {
      if (
        !this.#navigationDrawer.contains(event.target) &&
        !this.#drawerButton.contains(event.target)
      ) {
        this.#navigationDrawer.classList.remove('open');
        this.#drawerButton.setAttribute('aria-expanded', 'false');
      }

      this.#navigationDrawer.querySelectorAll('a').forEach((link) => {
        if (link.contains(event.target)) {
          this.#navigationDrawer.classList.remove('open');
          this.#drawerButton.setAttribute('aria-expanded', 'false');
        }
      });
    });

    // Update auth navigation
    this.updateAuthNavigation();
  }

  updateAuthNavigation() {
    const token = localStorage.getItem('authToken');
    const userName = localStorage.getItem('userName');
    const loginLink = document.getElementById('login-link');
    const registerLink = document.getElementById('register-link');
    const logoutBtn = document.getElementById('logout-btn');
    const userInfo = document.getElementById('user-info');

    if (token && userName) {
      // User is logged in
      if (loginLink) loginLink.style.display = 'none';
      if (registerLink) registerLink.style.display = 'none';
      if (logoutBtn) {
        logoutBtn.style.display = 'inline-block';
        logoutBtn.addEventListener('click', () => {
          localStorage.removeItem('authToken');
          localStorage.removeItem('userId');
          localStorage.removeItem('userName');
          this.updateAuthNavigation();
          window.location.hash = '#/';
        });
      }
      if (userInfo) {
        userInfo.textContent = `Halo, ${userName}`;
        userInfo.style.display = 'inline';
      }
    } else {
      // User is not logged in
      if (loginLink) loginLink.style.display = 'inline-block';
      if (registerLink) registerLink.style.display = 'inline-block';
      if (logoutBtn) logoutBtn.style.display = 'none';
      if (userInfo) userInfo.style.display = 'none';
    }
  }

  async renderPage() {
    const url = getActiveRoute();
    const page = routes[url];

    // Cleanup previous page if it has cleanup method
    const previousUrl = this.#currentUrl;
    if (previousUrl && routes[previousUrl] && typeof routes[previousUrl].cleanup === 'function') {
      routes[previousUrl].cleanup();
    }
    this.#currentUrl = url;

    // Update auth navigation
    this.updateAuthNavigation();

    // View transition support
    if (document.startViewTransition) {
      document.startViewTransition(async () => {
        this.#content.innerHTML = await page.render();
        await page.afterRender();
      });
    } else {
      // Fallback untuk browser yang tidak support view transition
      this.#content.innerHTML = await page.render();
      await page.afterRender();
    }
  }
}

export default App;
