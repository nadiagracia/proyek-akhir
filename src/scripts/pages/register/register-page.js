import { registerUser } from '../../data/api';

export default class RegisterPage {
  async render() {
    return `
      <section class="container auth-container">
        <h1>Daftar Akun Baru</h1>
        <form id="register-form" class="auth-form" novalidate>
          <div class="form-group">
            <label for="register-name">Nama</label>
            <input 
              type="text" 
              id="register-name" 
              name="name" 
              required 
              aria-required="true"
              aria-label="Nama lengkap"
            />
            <span class="error-message" id="name-error" role="alert" aria-live="polite"></span>
          </div>
          
          <div class="form-group">
            <label for="register-email">Email</label>
            <input 
              type="email" 
              id="register-email" 
              name="email" 
              required 
              aria-required="true"
              aria-label="Alamat email"
            />
            <span class="error-message" id="email-error" role="alert" aria-live="polite"></span>
          </div>
          
          <div class="form-group">
            <label for="register-password">Password</label>
            <input 
              type="password" 
              id="register-password" 
              name="password" 
              required 
              minlength="8"
              aria-required="true"
              aria-label="Password minimal 8 karakter"
            />
            <span class="error-message" id="password-error" role="alert" aria-live="polite"></span>
          </div>
          
          <button type="submit" class="btn btn-primary">Daftar</button>
          <p class="auth-link">
            Sudah punya akun? <a href="#/login">Masuk di sini</a>
          </p>
        </form>
      </section>
    `;
  }

  async afterRender() {
    const form = document.getElementById('register-form');
    const nameInput = document.getElementById('register-name');
    const emailInput = document.getElementById('register-email');
    const passwordInput = document.getElementById('register-password');

    // Validasi real-time
    nameInput.addEventListener('blur', () => this.validateName());
    emailInput.addEventListener('blur', () => this.validateEmail());
    passwordInput.addEventListener('blur', () => this.validatePassword());

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      if (this.validateForm()) {
        await this.handleSubmit();
      }
    });
  }

  validateName() {
    const nameInput = document.getElementById('register-name');
    const errorElement = document.getElementById('name-error');
    const name = nameInput.value.trim();

    if (!name) {
      this.showError(errorElement, 'Nama harus diisi');
      return false;
    }
    this.hideError(errorElement);
    return true;
  }

  validateEmail() {
    const emailInput = document.getElementById('register-email');
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
    const passwordInput = document.getElementById('register-password');
    const errorElement = document.getElementById('password-error');
    const password = passwordInput.value;

    if (!password) {
      this.showError(errorElement, 'Password harus diisi');
      return false;
    }
    if (password.length < 8) {
      this.showError(errorElement, 'Password minimal 8 karakter');
      return false;
    }
    this.hideError(errorElement);
    return true;
  }

  validateForm() {
    const isNameValid = this.validateName();
    const isEmailValid = this.validateEmail();
    const isPasswordValid = this.validatePassword();
    return isNameValid && isEmailValid && isPasswordValid;
  }

  async handleSubmit() {
    const form = document.getElementById('register-form');
    const submitButton = form.querySelector('button[type="submit"]');
    const nameInput = document.getElementById('register-name');
    const emailInput = document.getElementById('register-email');
    const passwordInput = document.getElementById('register-password');

    submitButton.disabled = true;
    submitButton.textContent = 'Mendaftar...';

    try {
      const response = await registerUser({
        name: nameInput.value.trim(),
        email: emailInput.value.trim(),
        password: passwordInput.value,
      });

      if (response.error === false) {
        alert('Registrasi berhasil! Silakan login.');
        window.location.hash = '#/login';
      } else {
        const errorElement = document.getElementById('email-error');
        this.showError(errorElement, response.message || 'Registrasi gagal');
      }
    } catch (error) {
      const errorElement = document.getElementById('email-error');
      this.showError(errorElement, 'Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = 'Daftar';
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

