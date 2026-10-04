(() => {
  'use strict';

  const DEFAULT_AVATAR = 'images/default-profile.webp';
  const SERVER_LABELS = {
    taiwan: 'Тайвань',
    pirate_china: 'Пиратка Китай',
    private_dubu: 'Приват Дубу',
    china: 'Китай'
  };
  const PRIVATE_PAGES = ['beginners.html', 'taiwan.html', 'pirate.html', 'game-content.html', 'profile.html'];
  const page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  const isPublicPage = page === 'index.html' || page === '';
  const cfg = window.WULINGUIDE_SUPABASE;

  if (!cfg || !window.supabase) {
    console.error('Supabase не загружен.');
    return;
  }

  const client = window.supabase.createClient(cfg.url, cfg.publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });

  const safeReturnPage = (value) => PRIVATE_PAGES.includes(value || '') ? value : '';

  async function getSession() {
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    return data.session || null;
  }

  async function getProfile(userId) {
    const { data, error } = await client.from('profiles')
      .select('id, username, server, avatar_path, created_at, updated_at')
      .eq('id', userId)
      .single();
    if (error) throw error;
    return data;
  }

  function getAvatarUrl(profile) {
    if (!profile?.avatar_path) return DEFAULT_AVATAR;
    return client.storage.from('avatars').getPublicUrl(profile.avatar_path).data.publicUrl || DEFAULT_AVATAR;
  }

  function buildAuthModal() {
    if (document.getElementById('auth-modal')) return;
    const modal = document.createElement('div');
    modal.id = 'auth-modal';
    modal.className = 'auth-modal-v1';
    modal.hidden = true;
    modal.innerHTML = `
      <div class="auth-dialog-v1" role="dialog" aria-modal="true" aria-labelledby="auth-title-v1">
        <button class="auth-close-v1" type="button" aria-label="Закрыть">×</button>
        <p class="tag">АККАУНТ WULINGUIDE</p>
        <h2 id="auth-title-v1">Вход</h2>
        <p class="auth-lead-v1">Войдите, чтобы открыть разделы руководства.</p>
        <div class="auth-tabs-v1" role="tablist">
          <button type="button" class="is-active" data-auth-tab="login">Вход</button>
          <button type="button" data-auth-tab="register">Регистрация</button>
        </div>
        <form class="auth-form-v1" data-auth-form="login" autocomplete="on">
          <label>Электронная почта<input name="email" type="email" autocomplete="email" required></label>
          <label>Пароль<input name="password" type="password" autocomplete="current-password" required minlength="6"></label>
          <p class="auth-message-v1" aria-live="polite"></p>
          <button class="auth-submit-v1" type="submit">Войти</button>
        </form>
        <form class="auth-form-v1" data-auth-form="register" hidden autocomplete="on">
          <label>Электронная почта<input name="email" type="email" autocomplete="email" required></label>
          <label>Логин<input name="login" type="text" autocomplete="username" required minlength="3" maxlength="32" pattern="[A-Za-zА-Яа-яЁё0-9_.-]+"></label>
          <label>Пароль<input name="password" type="password" autocomplete="new-password" required minlength="6"></label>
          <label>Повторите пароль<input name="password2" type="password" autocomplete="new-password" required minlength="6"></label>
          <p class="auth-message-v1" aria-live="polite"></p>
          <button class="auth-submit-v1" type="submit">Создать аккаунт</button>
        </form>
      </div>`;
    document.body.appendChild(modal);

    const close = modal.querySelector('.auth-close-v1');
    const tabs = [...modal.querySelectorAll('[data-auth-tab]')];
    const forms = [...modal.querySelectorAll('[data-auth-form]')];
    const title = modal.querySelector('#auth-title-v1');
    const lead = modal.querySelector('.auth-lead-v1');

    const setTab = (name) => {
      tabs.forEach(btn => btn.classList.toggle('is-active', btn.dataset.authTab === name));
      forms.forEach(form => form.hidden = form.dataset.authForm !== name);
      title.textContent = name === 'register' ? 'Регистрация' : 'Вход';
      lead.textContent = name === 'register'
        ? 'Создайте аккаунт. Сервер вы выберете после регистрации.'
        : 'Войдите, чтобы открыть разделы руководства.';
      forms.find(form => form.dataset.authForm === name)?.querySelector('input')?.focus();
    };

    const setBusy = (form, busy) => {
      const button = form.querySelector('button[type="submit"]');
      button.disabled = busy;
      button.textContent = busy ? 'Подождите…' : (form.dataset.authForm === 'register' ? 'Создать аккаунт' : 'Войти');
    };

    tabs.forEach(btn => btn.addEventListener('click', () => setTab(btn.dataset.authTab)));
    close.addEventListener('click', () => { modal.hidden = true; });
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.hidden = true; });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !modal.hidden) modal.hidden = true; });

    modal.querySelector('[data-auth-form="register"]').addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      const data = new FormData(form);
      const message = form.querySelector('.auth-message-v1');
      const email = String(data.get('email') || '').trim();
      const username = String(data.get('login') || '').trim();
      const password = String(data.get('password') || '');
      const password2 = String(data.get('password2') || '');
      message.textContent = '';
      if (password !== password2) {
        message.textContent = 'Пароли не совпадают.';
        return;
      }
      setBusy(form, true);
      try {
        const { data: signup, error } = await client.auth.signUp({
          email,
          password,
          options: { data: { username } }
        });
        if (error) throw error;
        if (!signup.session) {
          message.textContent = 'Аккаунт создан. Подтвердите почту, затем войдите.';
          form.reset();
          return;
        }
        modal.hidden = true;
        await ensureServerSelected(signup.user, true);
        await continueAfterAuth();
      } catch (err) {
        const raw = String(err?.message || 'Ошибка регистрации.');
        message.textContent = /database error saving new user/i.test(raw)
          ? 'Такой логин уже используется. Выберите другой.'
          : raw;
      } finally {
        setBusy(form, false);
      }
    });

    modal.querySelector('[data-auth-form="login"]').addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      const data = new FormData(form);
      const message = form.querySelector('.auth-message-v1');
      message.textContent = '';
      setBusy(form, true);
      try {
        const { data: signed, error } = await client.auth.signInWithPassword({
          email: String(data.get('email') || '').trim(),
          password: String(data.get('password') || '')
        });
        if (error) throw error;
        modal.hidden = true;
        await ensureServerSelected(signed.user, true);
        await continueAfterAuth();
      } catch (err) {
        message.textContent = /invalid login credentials/i.test(String(err?.message || ''))
          ? 'Неверная почта или пароль.'
          : String(err?.message || 'Не удалось войти.');
      } finally {
        setBusy(form, false);
      }
    });

    window.WulinGuideAuth.open = (tab = 'login') => {
      setTab(tab);
      modal.hidden = false;
    };
  }

  function buildServerModal() {
    if (document.getElementById('server-modal-v1')) return;
    const modal = document.createElement('div');
    modal.id = 'server-modal-v1';
    modal.className = 'auth-modal-v1';
    modal.hidden = true;
    modal.innerHTML = `
      <div class="auth-dialog-v1" role="dialog" aria-modal="true" aria-labelledby="server-title-v1">
        <p class="tag">ПЕРВЫЙ ВХОД</p>
        <h2 id="server-title-v1">Выберите сервер</h2>
        <p class="auth-lead-v1">Он будет сохранён в вашем личном кабинете.</p>
        <form class="auth-form-v1" id="server-form-v1">
          <label>Сервер
            <select name="server" required>
              <option value="" selected disabled>Выберите сервер</option>
              <option value="taiwan">Тайвань</option>
              <option value="pirate_china">Пиратка Китай</option>
              <option value="private_dubu">Приват Дубу</option>
              <option value="china">Китай</option>
            </select>
          </label>
          <p class="auth-message-v1" aria-live="polite"></p>
          <button class="auth-submit-v1" type="submit">Сохранить</button>
        </form>
      </div>`;
    document.body.appendChild(modal);

    modal.querySelector('#server-form-v1').addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      const message = form.querySelector('.auth-message-v1');
      const server = String(new FormData(form).get('server') || '');
      const session = await getSession();
      if (!session?.user) return;
      const button = form.querySelector('button[type="submit"]');
      button.disabled = true;
      button.textContent = 'Сохраняем…';
      message.textContent = '';
      try {
        const { error } = await client.from('profiles').update({ server }).eq('id', session.user.id);
        if (error) throw error;
        modal.hidden = true;
        document.dispatchEvent(new CustomEvent('wulinguide:server-selected', { detail: { server } }));
      } catch (err) {
        message.textContent = String(err?.message || 'Не удалось сохранить сервер.');
      } finally {
        button.disabled = false;
        button.textContent = 'Сохранить';
      }
    });
  }

  async function ensureServerSelected(user, forceModal = false) {
    if (!user) return false;
    let profile;
    try {
      profile = await getProfile(user.id);
    } catch (err) {
      console.error(err);
      return false;
    }
    if (profile.server) return true;
    buildServerModal();
    const modal = document.getElementById('server-modal-v1');
    modal.hidden = false;
    if (!forceModal) return false;
    await new Promise(resolve => {
      document.addEventListener('wulinguide:server-selected', resolve, { once: true });
    });
    return true;
  }

  async function continueAfterAuth() {
    const params = new URLSearchParams(location.search);
    const returnPage = safeReturnPage(params.get('return'));
    if (returnPage) {
      location.href = returnPage;
      return;
    }
    await refreshAccountLinks();
  }

  async function refreshAccountLinks() {
    const session = await getSession().catch(() => null);
    document.querySelectorAll('[data-account-link]').forEach((el) => {
      if (session?.user) {
        el.textContent = 'Личный кабинет';
        el.setAttribute('href', 'profile.html');
        el.removeAttribute('data-open-auth');
      } else {
        el.textContent = 'Войти';
        el.setAttribute('href', '#');
        el.setAttribute('data-open-auth', 'login');
      }
    });
  }

  document.addEventListener('click', (e) => {
    const opener = e.target.closest('[data-open-auth]');
    if (!opener) return;
    e.preventDefault();
    buildAuthModal();
    window.WulinGuideAuth.open(opener.dataset.openAuth || 'login');
  });

  async function protectCurrentPage() {
    if (isPublicPage) return;
    const session = await getSession().catch(() => null);
    if (!session?.user) {
      const returnPage = safeReturnPage(page);
      location.replace(`index.html?auth=required${returnPage ? `&return=${encodeURIComponent(returnPage)}` : ''}`);
      return;
    }
    await ensureServerSelected(session.user, false);
  }

  window.WulinGuideAuth = {
    client,
    defaultAvatar: DEFAULT_AVATAR,
    serverLabels: SERVER_LABELS,
    getSession,
    getProfile,
    getAvatarUrl,
    open: () => {},
    async signOut() {
      await client.auth.signOut();
      location.href = 'index.html';
    },
    async uploadAvatar(file) {
      const session = await getSession();
      if (!session?.user) throw new Error('Требуется вход в аккаунт.');
      if (!file || !/^image\/(png|jpeg|webp|gif)$/i.test(file.type)) throw new Error('Выберите PNG, JPG, WEBP или GIF.');
      if (file.size > 5 * 1024 * 1024) throw new Error('Изображение должно быть не больше 5 МБ.');
      const extByType = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' };
      const ext = extByType[file.type] || 'webp';
      const path = `${session.user.id}/avatar.${ext}`;
      const { error: uploadError } = await client.storage.from('avatars').upload(path, file, { upsert: true, cacheControl: '3600' });
      if (uploadError) throw uploadError;
      const { error: updateError } = await client.from('profiles').update({ avatar_path: path }).eq('id', session.user.id);
      if (updateError) throw updateError;
      return client.storage.from('avatars').getPublicUrl(path).data.publicUrl;
    },
    async resetAvatar() {
      const session = await getSession();
      if (!session?.user) throw new Error('Требуется вход в аккаунт.');
      const profile = await getProfile(session.user.id);
      if (profile.avatar_path) await client.storage.from('avatars').remove([profile.avatar_path]);
      const { error } = await client.from('profiles').update({ avatar_path: null }).eq('id', session.user.id);
      if (error) throw error;
      return DEFAULT_AVATAR;
    }
  };

  document.addEventListener('DOMContentLoaded', async () => {
    buildAuthModal();
    buildServerModal();
    await refreshAccountLinks();
    await protectCurrentPage();
    const params = new URLSearchParams(location.search);
    const session = await getSession().catch(() => null);
    if (isPublicPage && params.get('auth') === 'required' && !session?.user) {
      window.WulinGuideAuth.open('login');
    }
  });

  client.auth.onAuthStateChange(() => {
    setTimeout(() => refreshAccountLinks(), 0);
  });
})();