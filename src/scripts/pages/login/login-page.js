import { loginUser } from '../../data/api';

export default class LoginPage {
  async render() {
    return `
      <section class="container auth-container">
        <h1>Masuk ke Akun</h1>
        <form id="login-form" class="auth-form" novalidate>
          <div class="form-group">
            <label for="login-email">Email</label>
            <input 
              type="email" 
              id="login-email" 
              name="email" 
              required 
              aria-required="true"
              aria-label="Alamat email"
            />
            <span class="error-message" id="email-error" role="alert" aria-live="polite"></span>
          </div>
          
          <div class="form-group">
            <label for="login-password">Password</label>
            <input 
              type="password" 
              id="login-password" 
              name="password" 
              required 
              aria-required="true"
              aria-label="Password"
            />
            <span class="error-message" id="password-error" role="alert" aria-live="polite"></span>
          </div>
          
          <button type="submit" class="btn btn-primary">Masuk</button>
          <p class="auth-link">
            Belum punya akun? <a href="#/register">Daftar di sini</a>
          </p>
        </form>
      </section>
    `;
  }

  async afterRender() {
    const form = document.getElementById('login-form');
    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');

    // Validasi real-time
    emailInput.addEventListener('blur', () => this.validateEmail());
    passwordInput.addEventListener('blur', () => this.validatePassword());

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      if (this.validateForm()) {
        await this.handleSubmit();
      }
    });
  }

  validateEmail() {
    const emailInput = document.getElementById('login-email');
    const errorElement = document.getElementById('email-error');
    const email = emailInput.value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email) {
      this.showError(errorElement, 'Email harus diisi');
      return false;
    }
    if (!emailRegex.test(email)) {
      this.showError(errorElement, 'Format email tidak valid');
      return false;
    }
    this.hideError(errorElement);
    return true;
  }

  validatePassword() {
    const passwordInput = document.getElementById('login-password');
    const errorElement = document.getElementById('password-error');
    const password = passwordInput.value;

    if (!password) {
      this.showError(errorElement, 'Password harus diisi');
      return false;
    }
    this.hideError(errorElement);
    return true;
  }

  validateForm() {
    const isEmailValid = this.validateEmail();
    const isPasswordValid = this.validatePassword();
    return isEmailValid && isPasswordValid;
  }

  async handleSubmit() {
    const form = document.getElementById('login-form');
    const submitButton = form.querySelector('button[type="submit"]');
    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');

    submitButton.disabled = true;
    submitButton.textContent = 'Masuk...';

    try {
      const response = await loginUser({
        email: emailInput.value.trim(),
        password: passwordInput.value,
      });

      if (response.error === false && response.loginResult) {
        // Simpan token dan user info
        localStorage.setItem('authToken', response.loginResult.token);
        localStorage.setItem('userId', response.loginResult.userId);
        localStorage.setItem('userName', response.loginResult.name);
        
        alert('Login berhasil!');
        window.location.hash = '#/';
      } else {
        const errorElement = document.getElementById('password-error');
        this.showError(errorElement, response.message || 'Email atau password salah');
      }
    } catch (error) {
      const errorElement = document.getElementById('password-error');
      this.showError(errorElement, 'Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = 'Masuk';
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

