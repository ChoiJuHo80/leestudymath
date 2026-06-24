import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabaseClient = null;
let isMock = false;

// Basic validation for URL and Key
const isValidUrl = (url) => {
  try {
    return url && url.startsWith('https://') && url.includes('.supabase.co');
  } catch(e) {
    return false;
  }
};

const isValidKey = (key) => {
  return key && key.length > 20; // Anon keys are usually very long JWTs
};

if (isValidUrl(supabaseUrl) && isValidKey(supabaseAnonKey)) {
  try {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    isMock = false;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    isMock = true;
  }
} else {
  isMock = true;
}

// If mock mode is enabled, we create a mock supabase client
if (isMock) {
  console.log('⚡ Supabase is not configured or invalid credentials. Running in Mock Mode.');
  
  // Custom mock database stored in localStorage
  const getMockUsers = () => {
    try {
      const stored = localStorage.getItem('gongbubang_mock_users');
      return stored ? JSON.parse(stored) : [];
    } catch(e) {
      return [];
    }
  };

  const saveMockUsers = (users) => {
    try {
      localStorage.setItem('gongbubang_mock_users', JSON.stringify(users));
    } catch(e) {}
  };

  let session = null;
  const authStateCallbacks = [];

  const notifyAuthStateChange = (event, newSession) => {
    session = newSession;
    authStateCallbacks.forEach(cb => cb(event, session));
  };

  supabaseClient = {
    auth: {
      signUp: async ({ email, password, options }) => {
        // Wait 800ms to simulate network latency
        await new Promise(resolve => setTimeout(resolve, 800));

        const users = getMockUsers();
        if (users.find(u => u.email === email)) {
          return { data: { user: null }, error: { message: '이미 등록된 이메일 주소입니다.' } };
        }

        const newUser = {
          id: 'mock-user-' + Date.now(),
          email,
          user_metadata: options?.data || {},
          created_at: new Date().toISOString()
        };

        users.push({ ...newUser, password });
        saveMockUsers(users);

        // Auto login on signup in mock mode
        const newSession = { user: newUser, access_token: 'mock-token' };
        notifyAuthStateChange('SIGNED_IN', newSession);

        return { data: { user: newUser, session: newSession }, error: null };
      },

      signInWithPassword: async ({ email, password }) => {
        await new Promise(resolve => setTimeout(resolve, 800));

        // Hardcoded admin check
        if (email === 'teacher@math.com' && password === '9999') {
          const adminUser = {
            id: 'mock-admin-id',
            email: 'teacher@math.com',
            user_metadata: { name: '원장 이공', role: 'admin' }
          };
          const newSession = { user: adminUser, access_token: 'mock-admin-token' };
          notifyAuthStateChange('SIGNED_IN', newSession);
          return { data: { user: adminUser, session: newSession }, error: null };
        }

        const users = getMockUsers();
        const found = users.find(u => u.email === email && u.password === password);

        if (!found) {
          return { data: { user: null, session: null }, error: { message: '이메일 또는 비밀번호가 잘못되었습니다.' } };
        }

        const user = {
          id: found.id,
          email: found.email,
          user_metadata: found.user_metadata,
          created_at: found.created_at
        };

        const newSession = { user, access_token: 'mock-token-' + user.id };
        notifyAuthStateChange('SIGNED_IN', newSession);

        return { data: { user, session: newSession }, error: null };
      },

      signOut: async () => {
        await new Promise(resolve => setTimeout(resolve, 300));
        notifyAuthStateChange('SIGNED_OUT', null);
        return { error: null };
      },

      signInWithOAuth: async ({ provider, options }) => {
        await new Promise(resolve => setTimeout(resolve, 500));
        alert(`[모의 모드] ${provider} 소셜 로그인으로 로그인을 완료합니다.`);
        
        const mockUser = {
          id: 'mock-' + provider + '-user-' + Date.now(),
          email: `${provider}-student@example.com`,
          user_metadata: {
            name: `${provider.charAt(0).toUpperCase() + provider.slice(1)} 사용자`,
            phone: '010-0000-0000',
            role: 'student'
          },
          created_at: new Date().toISOString()
        };

        const newSession = { user: mockUser, access_token: `mock-${provider}-token` };
        notifyAuthStateChange('SIGNED_IN', newSession);

        return { data: { provider, url: options?.redirectTo || window.location.origin }, error: null };
      },

      getSession: async () => {
        return { data: { session }, error: null };
      },

      onAuthStateChange: (callback) => {
        authStateCallbacks.push(callback);
        // Immediately fire with current session
        setTimeout(() => callback('INITIAL_SESSION', session), 0);
        return {
          data: {
            subscription: {
              unsubscribe: () => {
                const idx = authStateCallbacks.indexOf(callback);
                if (idx !== -1) authStateCallbacks.splice(idx, 1);
              }
            }
          }
        };
      }
    }
  };
}

export { supabaseClient as supabase, isMock };
