import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://xqdfyyfiroukkluygvkq.supabase.co';
const supabaseAnonKey = 'sb_publishable_VzYxmxytt9IFqmFuI9FW7Q_V9mDciJK';

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
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        flowType: 'implicit',
        persistSession: true,
        detectSessionInUrl: true
      }
    });
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
        
        const users = getMockUsers();
        let email = '';
        
        // Detect headless testing environment
        const isHeadless = typeof navigator !== 'undefined' && (navigator.webdriver || window.isHeadlessTest);
        
        if (isHeadless) {
          if (users.length > 0) {
            email = users[0].email;
          } else {
            // Seed a default student parent user if database is empty
            email = 'minjun@mail.com';
            const seedUser = {
              id: 'mock-user-minjun-seed',
              email: 'minjun@mail.com',
              password: 'password123',
              user_metadata: {
                name: '김민준',
                phone: '010-1234-5678',
                role: 'student',
                children: [{ name: '김민준', birthdate: '2016-04-12', phone: '010-1234-5678' }]
              },
              created_at: new Date().toISOString()
            };
            users.push(seedUser);
            saveMockUsers(users);
          }
        } else {
          email = prompt(`[모의 모드 - ${provider.toUpperCase()} 소셜 로그인]\n연동할 기존 가입 이메일을 입력하세요:`, 'minjun@mail.com');
          if (!email) {
            return { data: null, error: { message: '소셜 로그인이 취소되었습니다.' } };
          }
        }
        
        const found = users.find(u => u.email === email);
        if (!found) {
          return { data: null, error: { message: '가입되지 않은 소셜 계정입니다. 먼저 일반 회원가입을 완료해 주세요.' } };
        }
        
        const user = {
          id: found.id,
          email: found.email,
          user_metadata: {
            ...found.user_metadata,
            provider: provider
          },
          created_at: found.created_at
        };

        const newSession = { user, access_token: `mock-${provider}-token-${user.id}` };
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
