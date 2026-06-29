import { supabase, isMock } from './supabase.js';

document.addEventListener('DOMContentLoaded', () => {
    // Helper to safely re-render Lucide icons
    const safeCreateIcons = () => {
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        } else {
            console.warn('Lucide is not loaded yet.');
        }
        
        // Update Quick Menu highlights if in admin mode and highlights updater is defined
        if (typeof updateAdminQuickMenuHighlights === 'function' && isAdmin) {
            updateAdminQuickMenuHighlights();
        }
    };

    // Helper to safely parse student ID (handles numeric IDs and Supabase UUID strings)
    const parseStudentId = (rawId) => {
        if (!rawId) return rawId;
        return /^\d+$/.test(String(rawId)) ? parseInt(rawId, 10) : rawId;
    };

    // Helper to resolve student schedule (dynamic class schedule vs custom schedule)
    const getStudentSchedule = (student) => {
        if (!student) return { mon: '', tue: '', wed: '', thu: '', fri: '' };
        if (student.classId) {
            const cls = classes.find(c => String(c.id) === String(student.classId));
            if (cls) {
                return cls.schedule || { mon: '', tue: '', wed: '', thu: '', fri: '' };
            }
        }
        return student.schedule || { mon: '', tue: '', wed: '', thu: '', fri: '' };
    };

    // Helper to format time as HH:MM
    const formatTimeInput = (val) => {
        let cleaned = val.replace(/\D/g, '');
        cleaned = cleaned.substring(0, 4);
        
        if (cleaned.length >= 1) {
            const first = parseInt(cleaned[0], 10);
            if (first > 2) cleaned = '2';
        }
        if (cleaned.length >= 2) {
            const hour = parseInt(cleaned.substring(0, 2), 10);
            if (hour > 23) cleaned = '23' + cleaned.substring(2);
        }
        if (cleaned.length >= 3) {
            const minFirst = parseInt(cleaned[2], 10);
            if (minFirst > 5) cleaned = cleaned.substring(0, 2) + '5' + cleaned.substring(3);
        }
        
        if (cleaned.length > 2) {
            return cleaned.substring(0, 2) + ':' + cleaned.substring(2);
        }
        return cleaned;
    };

    const handleTimeInput = (e) => {
        const target = e.target;
        const formatted = formatTimeInput(target.value);
        if (target.value !== formatted) {
            target.value = formatted;
        }
    };

    // Helper to split "HH:MM ~ HH:MM" into {start, end}
    const splitTimeRange = (timeStr) => {
        if (!timeStr) return { start: '', end: '' };
        const parts = timeStr.split('~');
        if (parts.length === 2) {
            return {
                start: parts[0].trim(),
                end: parts[1].trim()
            };
        }
        return {
            start: timeStr.trim(),
            end: ''
        };
    };

    // Helper to join start and end into "HH:MM ~ HH:MM"
    const joinTimeRange = (start, end) => {
        start = (start || '').trim();
        end = (end || '').trim();
        if (start && end) {
            return `${start} ~ ${end}`;
        }
        return start || end || '';
    };

    // Helper to update unified login button label/state
    const getLoggedInUserName = () => {
        if (isAdmin) return '원장님';
        if (isStudent) {
            const studentSession = JSON.parse(localStorage.getItem('gongbubang_student_session') || 'null');
            if (studentSession) {
                return studentSession.name + ' (학생)';
            }
            const user = supabase.auth.user ? supabase.auth.user() : null;
            if (user) {
                return (user.user_metadata?.name || user.email) + ' (학부모)';
            }
            const s = students.find(x => x.id === loggedInStudentId);
            if (s) return s.name;
        }
        return '사용자';
    };

    const updateLoginButton = () => {
        const btnLoginToggle = document.getElementById('btn-login-toggle');
        const displayContainer = document.getElementById('user-profile-display-container');
        const loggedUserName = document.getElementById('logged-user-name');
        if (!btnLoginToggle) return;

        if (isAdmin || isStudent) {
            btnLoginToggle.classList.add('active-admin');
            btnLoginToggle.querySelector('span:last-child').textContent = '로그아웃';
            const iconWrapper = btnLoginToggle.querySelector('.student-icon-wrapper') || btnLoginToggle.querySelector('.login-icon-wrapper');
            if (iconWrapper) {
                iconWrapper.innerHTML = '<i data-lucide="log-out"></i>';
            }
            if (displayContainer && loggedUserName) {
                loggedUserName.textContent = getLoggedInUserName();
                displayContainer.style.display = 'flex';
            }
        } else {
            btnLoginToggle.classList.remove('active-admin');
            btnLoginToggle.querySelector('span:last-child').textContent = '로그인';
            const iconWrapper = btnLoginToggle.querySelector('.student-icon-wrapper') || btnLoginToggle.querySelector('.login-icon-wrapper');
            if (iconWrapper) {
                iconWrapper.innerHTML = '<i data-lucide="log-in"></i>';
            }
            if (displayContainer) {
                displayContainer.style.display = 'none';
            }
        }
        safeCreateIcons();
    };

    // ==========================================================================
    // Mobile Navigation Drawer Toggle
    // ==========================================================================
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const mobileMenuDrawer = document.getElementById('mobile-menu-drawer');
    
    if (mobileMenuToggle && mobileMenuDrawer) {
        mobileMenuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            mobileMenuDrawer.classList.toggle('open');
            const isOpen = mobileMenuDrawer.classList.contains('open');
            const iconWrapper = mobileMenuToggle.querySelector('.menu-icon-wrapper');
            
            if (iconWrapper) {
                if (isOpen) {
                    iconWrapper.innerHTML = '<i data-lucide="x"></i>';
                } else {
                    iconWrapper.innerHTML = '<i data-lucide="menu"></i>';
                }
            }
            safeCreateIcons();
        });

        const drawerLinks = document.querySelectorAll('.drawer-link');
        drawerLinks.forEach(link => {
            link.addEventListener('click', () => {
                mobileMenuDrawer.classList.remove('open');
                const iconWrapper = mobileMenuToggle.querySelector('.menu-icon-wrapper');
                if (iconWrapper) {
                    iconWrapper.innerHTML = '<i data-lucide="menu"></i>';
                }
                safeCreateIcons();
            });
        });

        document.addEventListener('click', (e) => {
            if (!mobileMenuDrawer.contains(e.target) && !mobileMenuToggle.contains(e.target)) {
                if (mobileMenuDrawer.classList.contains('open')) {
                    mobileMenuDrawer.classList.remove('open');
                    const iconWrapper = mobileMenuToggle.querySelector('.menu-icon-wrapper');
                    if (iconWrapper) {
                        iconWrapper.innerHTML = '<i data-lucide="menu"></i>';
                    }
                    safeCreateIcons();
                }
            }
        });
    }

    // ==========================================================================
    // Supabase Connection Status Badge & Modal Toggles
    // ==========================================================================
    const statusBadge = document.getElementById('supabase-status-badge');
    if (statusBadge) {
        if (isMock) {
            statusBadge.className = 'supabase-status-badge mock';
            statusBadge.querySelector('.status-text').textContent = '모의 모드';
        } else {
            statusBadge.className = 'supabase-status-badge connected';
            statusBadge.querySelector('.status-text').textContent = 'Supabase 연결됨';
        }
    }

    // Login Type Tabs toggles
    const btnTabEasy = document.getElementById('btn-tab-easy');
    const btnTabEmail = document.getElementById('btn-tab-email');
    const btnTabAdmin = document.getElementById('btn-tab-admin');
    const easyLoginForm = document.getElementById('student-login-form');
    const emailLoginForm = document.getElementById('student-email-login-form');
    const adminLoginForm = document.getElementById('admin-login-form');
    const socialLoginDivider = document.querySelector('.social-login-divider');
    const socialLoginButtons = document.querySelector('.social-login-buttons');
    const signupPrompt = document.querySelector('.signup-prompt');

    if (btnTabEasy && btnTabEmail && btnTabAdmin && easyLoginForm && emailLoginForm && adminLoginForm) {
        btnTabEasy.addEventListener('click', () => {
            btnTabEasy.classList.add('active');
            btnTabEmail.classList.remove('active');
            btnTabAdmin.classList.remove('active');
            easyLoginForm.style.display = 'block';
            emailLoginForm.style.display = 'none';
            adminLoginForm.style.display = 'none';
            if (socialLoginDivider) socialLoginDivider.style.display = 'block';
            if (socialLoginButtons) socialLoginButtons.style.display = 'grid';
            if (signupPrompt) signupPrompt.style.display = 'block';
        });

        btnTabEmail.addEventListener('click', () => {
            btnTabEmail.classList.add('active');
            btnTabEasy.classList.remove('active');
            btnTabAdmin.classList.remove('active');
            emailLoginForm.style.display = 'block';
            easyLoginForm.style.display = 'none';
            adminLoginForm.style.display = 'none';
            if (socialLoginDivider) socialLoginDivider.style.display = 'block';
            if (socialLoginButtons) socialLoginButtons.style.display = 'grid';
            if (signupPrompt) signupPrompt.style.display = 'block';
        });

        btnTabAdmin.addEventListener('click', () => {
            btnTabAdmin.classList.add('active');
            btnTabEasy.classList.remove('active');
            btnTabEmail.classList.remove('active');
            adminLoginForm.style.display = 'block';
            easyLoginForm.style.display = 'none';
            emailLoginForm.style.display = 'none';
            if (socialLoginDivider) socialLoginDivider.style.display = 'none';
            if (socialLoginButtons) socialLoginButtons.style.display = 'none';
            if (signupPrompt) signupPrompt.style.display = 'none';
        });
    }

    // Social Login (OAuth) handlers
    const btnGoogleLogin = document.getElementById('btn-google-login');

    if (btnGoogleLogin) {
        btnGoogleLogin.addEventListener('click', async () => {
            try {
                const { error } = await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                        redirectTo: window.location.origin
                    }
                });
                if (error) {
                    console.error('Google login error:', error.message);
                    alert('Google 로그인 오류: ' + error.message);
                }
            } catch (err) {
                console.error('Google login exceptional error:', err);
            }
        });
    }

    // ID/비밀번호 찾기 DOM Elements & Logic
    const linkFindCredentials = document.getElementById('link-find-credentials');
    const findCredentialsModal = document.getElementById('find-credentials-modal');
    const btnFindCredentialsClose = document.getElementById('btn-find-credentials-close');
    const linkFindBackLogin = document.getElementById('link-find-back-login');
    const btnTabFindId = document.getElementById('btn-tab-find-id');
    const btnTabFindPw = document.getElementById('btn-tab-find-pw');
    const findIdForm = document.getElementById('find-id-form');
    const findPwForm = document.getElementById('find-pw-form');
    const findIdPhoneInput = document.getElementById('find-id-phone');
    const findPwEmailInput = document.getElementById('find-pw-email');
    const findPwPhoneInput = document.getElementById('find-pw-phone');
    const findIdResult = document.getElementById('find-id-result');
    const findPwResult = document.getElementById('find-pw-result');
    const loginModal = document.getElementById('student-login-modal');

    if (linkFindCredentials && findCredentialsModal && loginModal) {
        linkFindCredentials.addEventListener('click', (e) => {
            e.preventDefault();
            loginModal.classList.remove('open');
            findCredentialsModal.classList.add('open');
            
            // Reset state
            if (btnTabFindId) btnTabFindId.click();
            if (findIdPhoneInput) findIdPhoneInput.value = '';
            if (findPwEmailInput) findPwEmailInput.value = '';
            if (findPwPhoneInput) findPwPhoneInput.value = '';
            if (findIdResult) findIdResult.style.display = 'none';
            if (findPwResult) findPwResult.style.display = 'none';
            
            if (findIdPhoneInput) findIdPhoneInput.focus();
        });
    }

    if (btnFindCredentialsClose && findCredentialsModal) {
        btnFindCredentialsClose.addEventListener('click', () => {
            findCredentialsModal.classList.remove('open');
        });
    }

    if (findCredentialsModal) {
        findCredentialsModal.addEventListener('click', (e) => {
            if (e.target === findCredentialsModal) {
                findCredentialsModal.classList.remove('open');
            }
        });
    }

    if (linkFindBackLogin && findCredentialsModal && loginModal) {
        linkFindBackLogin.addEventListener('click', (e) => {
            e.preventDefault();
            findCredentialsModal.classList.remove('open');
            loginModal.classList.add('open');
        });
    }

    if (btnTabFindId && btnTabFindPw && findIdForm && findPwForm) {
        btnTabFindId.addEventListener('click', () => {
            btnTabFindId.classList.add('active');
            btnTabFindPw.classList.remove('active');
            findIdForm.style.display = 'block';
            findPwForm.style.display = 'none';
        });

        btnTabFindPw.addEventListener('click', () => {
            btnTabFindPw.classList.add('active');
            btnTabFindId.classList.remove('active');
            findIdForm.style.display = 'none';
            findPwForm.style.display = 'block';
        });
    }

    if (findIdForm) {
        findIdForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const phone = findIdPhoneInput.value.trim();
            if (!phone) return;

            const mockUsers = JSON.parse(localStorage.getItem('gongbubang_mock_users') || '[]');
            const matchedUsers = mockUsers.filter(u => {
                const userPhone = u.user_metadata?.phone;
                const matchesPhone = userPhone === phone;
                const children = u.user_metadata?.children || [];
                const matchesChildPhone = children.some(c => c.phone === phone) || u.user_metadata?.phone === phone;
                return matchesPhone || matchesChildPhone;
            });

            const matchedStudents = students.filter(s => s.phone === phone || s.parentPhone === phone);

            if (matchedUsers.length === 0 && matchedStudents.length === 0) {
                findIdResult.innerHTML = `<span style="color: var(--error-color); font-weight: 700;">해당 연락처로 가입된 회원 정보를 찾을 수 없습니다.</span>`;
            } else {
                let html = `<p style="font-weight: 700; color: var(--primary-color); margin-bottom: 8px;">조회된 회원 정보:</p>`;
                const shownEmails = new Set();
                const shownStudents = new Set();

                matchedUsers.forEach(u => {
                    if (u.email && !shownEmails.has(u.email)) {
                        shownEmails.add(u.email);
                        const role = u.user_metadata?.role === 'admin' ? '관리자' : '학부모/학생';
                        html += `<div>• <strong>이메일:</strong> ${u.email} (${role})</div>`;
                    }
                });

                matchedStudents.forEach(s => {
                    const key = `${s.name}-${s.phone}`;
                    if (!shownStudents.has(key)) {
                        shownStudents.add(key);
                        html += `<div>• <strong>원생 이름:</strong> ${s.name} (${s.school || '학생'})</div>`;
                    }
                });

                findIdResult.innerHTML = html;
            }
            findIdResult.style.display = 'block';
        });
    }

    if (findPwForm) {
        findPwForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = findPwEmailInput.value.trim();
            const phone = findPwPhoneInput.value.trim();
            if (!email || !phone) return;

            const mockUsers = JSON.parse(localStorage.getItem('gongbubang_mock_users') || '[]');
            const foundUser = mockUsers.find(u => u.email === email && (u.user_metadata?.phone === phone || (u.user_metadata?.children || []).some(c => c.phone === phone)));

            if (!foundUser) {
                if (email === 'teacher@math.com' && phone === '010-0000-0000') {
                    findPwResult.innerHTML = `
                        <div style="color: var(--success-color); font-weight: 700; margin-bottom: 5px;">관리자 계정 확인 완료!</div>
                        <div>원장님의 비밀번호는 <strong>9999</strong> 입니다.</div>
                    `;
                } else {
                    findPwResult.innerHTML = `<span style="color: var(--error-color); font-weight: 700;">입력하신 이메일과 연락처에 일치하는 회원 정보가 없습니다.</span>`;
                }
            } else {
                const pwd = foundUser.password || '비밀번호 정보 없음 (소셜 연동 계정)';
                findPwResult.innerHTML = `
                    <div style="color: var(--success-color); font-weight: 700; margin-bottom: 5px;">회원 정보 확인 완료!</div>
                    <div>회원님의 비밀번호는 <strong>${pwd}</strong> 입니다.</div>
                `;
            }
            findPwResult.style.display = 'block';
        });
    }

    const btnNaverLogin = document.getElementById('btn-naver-login');
    const btnKakaoLogin = document.getElementById('btn-kakao-login');

    if (btnNaverLogin) {
        btnNaverLogin.addEventListener('click', async () => {
            try {
                const { error } = await supabase.auth.signInWithOAuth({
                    provider: 'naver',
                    options: {
                        redirectTo: window.location.origin
                    }
                });
                if (error) {
                    console.error('Naver login error:', error.message);
                    alert('Naver 로그인 오류: ' + error.message);
                }
            } catch (err) {
                console.error('Naver login exceptional error:', err);
            }
        });
    }

    if (btnKakaoLogin) {
        btnKakaoLogin.addEventListener('click', async () => {
            try {
                const { error } = await supabase.auth.signInWithOAuth({
                    provider: 'kakao',
                    options: {
                        redirectTo: window.location.origin
                    }
                });
                if (error) {
                    console.error('Kakao login error:', error.message);
                    alert('Kakao 로그인 오류: ' + error.message);
                } else {
                    // Successful login: close login modal and update UI
                    const loginModal = document.getElementById('student-login-modal');
                    if (loginModal) loginModal.classList.remove('open');
                    updateLoginButton();
                }
            } catch (err) {
                console.error('Kakao login exceptional error:', err);
            }
        });
    }

    // Signup Modal toggles & Dynamic Children logic
    const linkGoSignup = document.getElementById('link-go-signup');
    const studentSignupModal = document.getElementById('student-signup-modal');
    const btnStudentSignupClose = document.getElementById('btn-student-signup-close');
    const studentLoginModal = document.getElementById('student-login-modal');
    const signupChildrenContainer = document.getElementById('signup-children-container');
    const btnSignupAddChild = document.getElementById('btn-signup-add-child');

    // Helper to auto-format phone numbers as 010-XXXX-XXXX
    const handlePhoneInput = (e) => {
        const target = e.target;
        let val = target.value.replace(/[^0-9]/g, '');
        if (val.length > 11) {
            val = val.substring(0, 11);
        }
        let formatted = '';
        if (val.length < 4) {
            formatted = val;
        } else if (val.length < 8) {
            formatted = val.substr(0, 3) + '-' + val.substr(3);
        } else {
            formatted = val.substr(0, 3) + '-' + val.substr(3, 4) + '-' + val.substr(7);
        }
        if (target.value !== formatted) {
            target.value = formatted;
        }
    };

    // Apply formatter to static phone fields
    const staticPhoneFields = [
        'student-phone-input',
        'student-parent-phone-input',
        'student-login-phone',
        'student-signup-phone',
        'find-id-phone',
        'find-pw-phone'
    ];
    staticPhoneFields.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', handlePhoneInput);
        }
    });

    // Apply formatter to time range inputs
    document.querySelectorAll('.time-input').forEach(el => {
        el.addEventListener('input', handleTimeInput);
    });

    // Helper to calculate end time based on start time (HH:MM) and duration (minutes)
    const calculateEndTime = (startTimeStr, durationMinutes) => {
        if (!startTimeStr || startTimeStr.length !== 5) return '';
        const parts = startTimeStr.split(':');
        if (parts.length !== 2) return '';
        
        let hour = parseInt(parts[0], 10);
        let min = parseInt(parts[1], 10);
        if (isNaN(hour) || isNaN(min)) return '';
        
        // Add duration
        min += durationMinutes;
        
        // Handle carry
        hour += Math.floor(min / 60);
        min = min % 60;
        hour = hour % 24; // Wrap around 24 hours
        
        const formattedHour = String(hour).padStart(2, '0');
        const formattedMin = String(min).padStart(2, '0');
        return `${formattedHour}:${formattedMin}`;
    };

    const updateEndTimeForInput = (startInput) => {
        const startVal = startInput.value;
        const durationInput = document.getElementById('student-class-duration');
        if (startVal.length === 5 && durationInput) {
            const duration = parseInt(durationInput.value, 10) || 0;
            if (duration > 0) {
                const endInputId = startInput.id.replace('-start', '-end');
                const endInput = document.getElementById(endInputId);
                if (endInput) {
                    endInput.value = calculateEndTime(startVal, duration);
                }
            }
        }
    };

    // Attach end time auto-calculation to start time inputs
    document.querySelectorAll('.start-time-input').forEach(el => {
        el.addEventListener('input', (e) => {
            updateEndTimeForInput(e.target);
        });
    });

    // Update end times when default class duration is modified
    const defaultDurationInput = document.getElementById('student-class-duration');
    if (defaultDurationInput) {
        defaultDurationInput.addEventListener('input', () => {
            const duration = parseInt(defaultDurationInput.value, 10) || 0;
            if (duration > 0) {
                document.querySelectorAll('.start-time-input').forEach(startInput => {
                    const startVal = startInput.value;
                    if (startVal.length === 5) {
                        const endInputId = startInput.id.replace('-start', '-end');
                        const endInput = document.getElementById(endInputId);
                        if (endInput) {
                            endInput.value = calculateEndTime(startVal, duration);
                        }
                    }
                });
            }
        });
    }

    let childIndex = 0;
    const createChildInputBlock = () => {
        childIndex++;
        const block = document.createElement('div');
        block.className = 'signup-child-block';
        block.id = `signup-child-block-${childIndex}`;
        block.innerHTML = `
            <div class="signup-child-header">
                <span class="signup-child-title">자녀 #${childIndex}</span>
                ${childIndex > 1 ? `
                    <button type="button" class="btn-signup-remove-child" data-block-id="signup-child-block-${childIndex}" title="삭제">
                        <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
                    </button>
                ` : ''}
            </div>
            <div class="form-group-modal-row-three">
                <div class="form-group-modal" style="margin-bottom: 8px;">
                    <label style="font-size: 0.8rem; margin-bottom: 4px; font-weight: 700;">이름</label>
                    <input type="text" class="child-name-input" required placeholder="예: 김민준" style="padding: 8px 12px; font-size: 0.85rem;">
                </div>
                <div class="form-group-modal" style="margin-bottom: 8px;">
                    <label style="font-size: 0.8rem; margin-bottom: 4px; font-weight: 700;">생년월일</label>
                    <input type="date" class="child-birth-input" required style="padding: 7px 12px; font-size: 0.85rem;">
                </div>
                <div class="form-group-modal" style="margin-bottom: 8px;">
                    <label style="font-size: 0.8rem; margin-bottom: 4px; font-weight: 700;">연락처 (선택)</label>
                    <input type="text" class="child-phone-input" placeholder="010-0000-0000" style="padding: 8px 12px; font-size: 0.85rem;">
                </div>
            </div>
            <div class="form-group-modal-row-two" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 8px;">
                <div class="form-group-modal" style="margin-bottom: 0;">
                    <label style="font-size: 0.8rem; margin-bottom: 4px; font-weight: 700; display: flex; justify-content: space-between; align-items: center;">
                        <span>학생 아이디</span>
                        <button type="button" class="btn-check-child-id" style="border: none; background: rgba(142,68,173,0.08); color: var(--primary-color); padding: 2px 6px; font-size: 0.65rem; border-radius: 4px; cursor: pointer; font-weight: 700;">중복 체크</button>
                    </label>
                    <input type="text" class="child-id-input" required placeholder="영문/숫자 4~12자" style="padding: 8px 12px; font-size: 0.85rem;">
                    <span class="child-id-check-msg" style="display: none; font-size: 0.68rem; margin-top: 2px; font-weight: 600;"></span>
                </div>
                <div class="form-group-modal" style="margin-bottom: 0;">
                    <label style="font-size: 0.8rem; margin-bottom: 4px; font-weight: 700;">비밀번호</label>
                    <input type="password" class="child-pw-input" required placeholder="비밀번호 입력" style="padding: 8px 12px; font-size: 0.85rem;">
                </div>
            </div>
        `;

        if (childIndex > 1) {
            const btnRemove = block.querySelector('.btn-signup-remove-child');
            if (btnRemove) {
                btnRemove.addEventListener('click', () => {
                    block.remove();
                    reindexChildBlocks();
                });
            }
        }

        const childPhoneInput = block.querySelector('.child-phone-input');
        if (childPhoneInput) {
            childPhoneInput.addEventListener('input', handlePhoneInput);
        }

        const btnCheck = block.querySelector('.btn-check-child-id');
        const idInput = block.querySelector('.child-id-input');
        const checkMsg = block.querySelector('.child-id-check-msg');
        if (btnCheck && idInput && checkMsg) {
            btnCheck.addEventListener('click', () => {
                const username = idInput.value.trim();
                if (!username) {
                    checkMsg.style.display = 'block';
                    checkMsg.style.color = '#ff4d4f';
                    checkMsg.textContent = '아이디를 입력해 주세요.';
                    return;
                }
                if (username.length < 4) {
                    checkMsg.style.display = 'block';
                    checkMsg.style.color = '#ff4d4f';
                    checkMsg.textContent = '아이디는 4자 이상이어야 합니다.';
                    return;
                }
                
                const takenInStudents = students.some(s => s.username && s.username.toLowerCase() === username.toLowerCase());
                const mockUsers = JSON.parse(localStorage.getItem('gongbubang_mock_users') || '[]');
                let takenInMock = false;
                mockUsers.forEach(u => {
                    if (u.role === 'student' && u.email === username) {
                        takenInMock = true;
                    }
                    const children = u.user_metadata?.children || [];
                    if (children.some(c => c.username && c.username.toLowerCase() === username.toLowerCase())) {
                        takenInMock = true;
                    }
                });
                
                if (takenInStudents || takenInMock) {
                    checkMsg.style.display = 'block';
                    checkMsg.style.color = '#ff4d4f';
                    checkMsg.textContent = '이미 사용 중인 아이디입니다.';
                } else {
                    checkMsg.style.display = 'block';
                    checkMsg.style.color = '#52c41a';
                    checkMsg.textContent = '사용 가능한 아이디입니다.';
                }
            });
        }

        signupChildrenContainer.appendChild(block);
        safeCreateIcons();
    };

    const reindexChildBlocks = () => {
        const blocks = signupChildrenContainer.querySelectorAll('.signup-child-block');
        childIndex = 0;
        blocks.forEach(block => {
            childIndex++;
            block.id = `signup-child-block-${childIndex}`;
            block.querySelector('.signup-child-title').textContent = `자녀 #${childIndex}`;
            const header = block.querySelector('.signup-child-header');
            let removeBtn = header.querySelector('.btn-signup-remove-child');
            if (childIndex === 1 && removeBtn) {
                removeBtn.remove();
            } else if (childIndex > 1 && !removeBtn) {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'btn-signup-remove-child';
                btn.dataset.blockId = `signup-child-block-${childIndex}`;
                btn.title = '삭제';
                btn.innerHTML = `<i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>`;
                btn.addEventListener('click', () => {
                    block.remove();
                    reindexChildBlocks();
                });
                header.appendChild(btn);
            }
        });
        safeCreateIcons();
    };

    if (btnSignupAddChild) {
        btnSignupAddChild.addEventListener('click', () => {
            createChildInputBlock();
        });
    }

    if (linkGoSignup && studentSignupModal && studentLoginModal) {
        linkGoSignup.addEventListener('click', (e) => {
            e.preventDefault();
            studentLoginModal.classList.remove('open');
            
            // Reset to Step 1: Social 인증 선택
            const stepSocial = document.getElementById('signup-step-social');
            const stepProfile = document.getElementById('signup-step-profile');
            if (stepSocial) stepSocial.style.display = 'block';
            if (stepProfile) stepProfile.style.display = 'none';

            // Clear and add first child
            if (signupChildrenContainer) {
                signupChildrenContainer.innerHTML = '';
                childIndex = 0;
                createChildInputBlock();
            }

            studentSignupModal.classList.add('open');
        });
    }

    // Social Signup buttons
    const btnSignupGoogle = document.getElementById('btn-signup-google');
    const btnSignupKakao = document.getElementById('btn-signup-kakao');

    if (btnSignupGoogle) {
        btnSignupGoogle.addEventListener('click', async () => {
            try {
                sessionStorage.setItem('gongbubang_signup_flow', 'true');
                const { error } = await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                        redirectTo: window.location.origin
                    }
                });
                if (error) {
                    console.error('Google signup error:', error.message);
                    alert('Google 인증 오류: ' + error.message);
                }
            } catch (err) {
                console.error('Google signup exceptional error:', err);
            }
        });
    }

    if (btnSignupKakao) {
        btnSignupKakao.addEventListener('click', async () => {
            try {
                sessionStorage.setItem('gongbubang_signup_flow', 'true');
                const { error } = await supabase.auth.signInWithOAuth({
                    provider: 'kakao',
                    options: {
                        redirectTo: window.location.origin
                    }
                });
                if (error) {
                    console.error('Kakao signup error:', error.message);
                    alert('Kakao 인증 오류: ' + error.message);
                }
            } catch (err) {
                console.error('Kakao signup exceptional error:', err);
            }
        });
    }

    if (btnStudentSignupClose && studentSignupModal) {
        btnStudentSignupClose.addEventListener('click', async () => {
            studentSignupModal.classList.remove('open');
            sessionStorage.removeItem('gongbubang_signup_flow');
            
            // If they authenticated but closed the signup modal before saving profile, sign out
            const sessionResp = await supabase.auth.getSession();
            const session = sessionResp.data.session;
            if (session && session.user) {
                const mockUsers = JSON.parse(localStorage.getItem('gongbubang_mock_users') || '[]');
                const exists = mockUsers.some(u => String(u.email).toLowerCase() === String(session.user.email).toLowerCase());
                if (!exists) {
                    await supabase.auth.signOut();
                }
            }
        });
    }

    // Backdrop click listener removed so signup modal does not close when clicking outside

    // ==========================================================================
    // Active Navigation Link on Scroll
    // ==========================================================================
    const sections = document.querySelectorAll('.feed-section');
    const navLinks = document.querySelectorAll('.blog-nav-link');

    const scrollActive = () => {
        const scrollY = window.pageYOffset;

        sections.forEach(current => {
            // Check if section is displayed (since student section is hidden by default)
            if (current.style.display === 'none') return;

            const sectionHeight = current.offsetHeight;
            const sectionTop = current.offsetTop - 120;
            const sectionId = current.getAttribute('id');
            const navActiveLink = document.querySelector(`.blog-nav a[href*=${sectionId}]`);

            if (navActiveLink) {
                if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
                    navLinks.forEach(link => link.classList.remove('active'));
                    navActiveLink.classList.add('active');
                }
            }
        });
    };
    window.addEventListener('scroll', scrollActive);

    // ==========================================================================
    // Mascot Card Click: Smooth Scroll with Focus Offset
    // ==========================================================================
    const mascotCards = document.querySelectorAll('.mascot-card');
    mascotCards.forEach(card => {
        card.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = card.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            if (targetSection) {
                const targetOffset = targetSection.offsetTop - 90;
                window.scrollTo({
                    top: targetOffset,
                    behavior: 'smooth'
                });
            }
        });
    });

    // ==========================================================================
    // Worksheet Download Simulator & Toast Notifications
    // ==========================================================================
    const toastContainer = document.getElementById('toast-container');

    const showToast = (message) => {
        if (!toastContainer) return;
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `
            <i data-lucide="check-circle" class="toast-icon"></i>
            <span>${message}</span>
        `;
        toastContainer.appendChild(toast);
        safeCreateIcons();

        setTimeout(() => {
            toast.style.animation = 'slideIn 0.3s ease-out reverse';
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3500);
    };

    // Default Resources Data
    const defaultResources = [
        {
            id: 'res-1',
            title: '2026 초등 연산왕 특강 - 모의고사 1회 (정답/풀이 포함).pdf',
            size: '3.4 MB',
            target: '초등 전학년',
            type: 'pdf',
            filename: '2026 초등 연산왕 특강 - 모의고사 1회.pdf',
            downloads: 1421
        },
        {
            id: 'res-2',
            title: '중등 2학기 도형(기하) 핵심 공식집 및 오답 잡는 비법 요약노트.zip',
            size: '8.9 MB',
            target: '중등 전학년',
            type: 'zip',
            filename: '중등 2학기 도형 핵심 공식집.zip',
            downloads: 843
        },
        {
            id: 'res-3',
            title: '서술형 킬러 문항 완벽 격파 - 하루 5문제 훈련장 (중등 대수편).hwp',
            size: '1.2 MB',
            target: '중등 2-3학년',
            type: 'hwp',
            filename: '서술형 킬러 문항 완벽 격파 훈련장.hwp',
            downloads: 911
        }
    ];

    // Seed resources if empty
    if (!localStorage.getItem('gongbubang_resources')) {
        localStorage.setItem('gongbubang_resources', JSON.stringify(defaultResources));
    }

    const renderResources = () => {
        const listContainer = document.querySelector('.resources-list');
        if (!listContainer) return;
        listContainer.innerHTML = '';
        
        let resources = [];
        try {
            resources = JSON.parse(localStorage.getItem('gongbubang_resources') || '[]');
        } catch(e){}
        
        if (resources.length === 0) {
            listContainer.innerHTML = '<div style="padding: 24px; text-align: center; color: var(--text-muted);">등록된 자료가 없습니다.</div>';
            return;
        }
        
        resources.forEach(res => {
            const item = document.createElement('div');
            item.className = 'resource-item';
            
            let iconClass = 'pdf-type';
            if (res.type === 'zip') {
                iconClass = 'zip-type';
            } else if (res.type === 'hwp') {
                iconClass = 'hwp-type';
            } else if (res.type === 'xls') {
                iconClass = 'xls-type';
            }
            
            item.innerHTML = `
                <div class="res-info">
                    <i data-lucide="file-text" class="file-icon ${iconClass}"></i>
                    <div class="file-details">
                        <h4 class="file-title">${res.title}</h4>
                        <span class="file-meta">파일크기: ${res.size} &middot; 다운로드 수: ${res.downloads}회 &middot; 대상: ${res.target}</span>
                    </div>
                </div>
                <button class="btn-download" data-filename="${res.filename}" data-id="${res.id}">
                    <i data-lucide="download"></i>
                    <span>다운로드</span>
                </button>
            `;
            
            const btn = item.querySelector('.btn-download');
            btn.addEventListener('click', () => {
                if (btn.classList.contains('downloading')) return;
                btn.classList.add('downloading');
                btn.innerHTML = `<i data-lucide="loader-2" class="animate-spin"></i><span>다운로드 중...</span>`;
                safeCreateIcons();
                
                setTimeout(() => {
                    btn.classList.remove('downloading');
                    btn.innerHTML = `<i data-lucide="download"></i><span>다운로드</span>`;
                    safeCreateIcons();
                    
                    res.downloads = (res.downloads || 0) + 1;
                    localStorage.setItem('gongbubang_resources', JSON.stringify(resources));
                    renderResources();
                    if (isAdmin) renderAdminResources();
                    
                    showToast(`"${res.filename}" 다운로드가 완료되었습니다.`);
                }, 1500);
            });
            
            listContainer.appendChild(item);
        });
        safeCreateIcons();
    };

    const renderAdminResources = () => {
        const listContainer = document.getElementById('admin-resource-list-container');
        if (!listContainer) return;
        listContainer.innerHTML = '';
        
        let resources = [];
        try {
            resources = JSON.parse(localStorage.getItem('gongbubang_resources') || '[]');
        } catch(e){}
        
        resources.forEach(res => {
            const item = document.createElement('div');
            item.className = 'class-list-item';
            item.style = 'display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border: 1px solid var(--border-color); border-radius: 8px; background: #ffffff; margin-bottom: 8px;';
            item.innerHTML = `
                <div style="display: flex; flex-direction: column; gap: 4px;">
                    <span style="font-size: 0.88rem; font-weight: 700; color: var(--text-primary); text-align: left;">${res.title}</span>
                    <span style="font-size: 0.78rem; color: var(--text-secondary); text-align: left;">${res.size} | ${res.target} | 다운로드: ${res.downloads}회</span>
                </div>
                <div style="display: flex; gap: 6px;">
                    <button type="button" class="btn-resource-edit" data-id="${res.id}" style="border: none; background: #f1f5f9; cursor: pointer; padding: 6px; border-radius: 6px; color: var(--text-primary);"><i data-lucide="edit-2" style="width: 14px; height: 14px;"></i></button>
                    <button type="button" class="btn-resource-delete" data-id="${res.id}" style="border: none; background: #fff1f0; cursor: pointer; padding: 6px; border-radius: 6px; color: #ff4d4f;"><i data-lucide="trash-2" style="width: 14px; height: 14px;"></i></button>
                </div>
            `;
            
            item.querySelector('.btn-resource-edit').addEventListener('click', () => {
                document.getElementById('edit-resource-id').value = res.id;
                document.getElementById('resource-title-input').value = res.title;
                document.getElementById('resource-size-input').value = res.size;
                document.getElementById('resource-target-input').value = res.target;
                document.getElementById('resource-type-select').value = res.type;
                document.getElementById('resource-filename-input').value = res.filename;
                document.getElementById('resource-editor-title').innerHTML = `<i data-lucide="edit-3" style="width: 18px; height: 18px;"></i> 자료 수정`;
                safeCreateIcons();
            });
            
            item.querySelector('.btn-resource-delete').addEventListener('click', () => {
                if (confirm('이 자료를 삭제하시겠습니까?')) {
                    const filtered = resources.filter(r => r.id !== res.id);
                    localStorage.setItem('gongbubang_resources', JSON.stringify(filtered));
                    renderResources();
                    renderAdminResources();
                    showToast('자료가 삭제되었습니다.');
                }
            });
            
            listContainer.appendChild(item);
        });
        safeCreateIcons();
    };

    // Initialize Resources view
    setTimeout(renderResources, 100);

    // ==========================================================================
    // Notice CRUD Panel
    // ==========================================================================
    const defaultNotices = [
        {
            id: 1,
            tag: '모집중',
            title: '[공고] 2026년 여름방학 수학 특강반 원생 모집 안내 (선착순 마감)',
            content: '여름방학 기간 동안 한 학기 앞서 연산과 핵심 개념을 완전하게 완성하는 4주 특별 코스입니다. 기초 개념반부터 심화 서술형 풀이반까지 반별 정원 6명 선착순 접수 중입니다.',
            date: '2026. 06. 20',
            author: '이공 원장',
            titleSize: 'large',
            titleColor: 'red',
            pinned: true,
            highlight: true
        },
        {
            id: 2,
            tag: '공지',
            title: '[안내] 서술형 내신 완벽 대비를 위한 풀이노트 개편 및 첨삭 지도 강화',
            content: '서술형 문항 감점을 제로화하기 위한 단단계 풀이 습관 작성 노트가 새로 적용되었습니다. 이공 원장의 1:1 집중 대면 첨삭 시간이 확대 운영됩니다.',
            date: '2026. 06. 15',
            author: '이공 원장',
            titleSize: 'normal',
            titleColor: 'default',
            pinned: false,
            highlight: false
        },
        {
            id: 3,
            tag: '안내',
            title: '[안내] 공부방 차량 운행 및 등하원 안전 실시간 안심 문자 서비스 제공 안내',
            content: '공부방 입실 및 퇴실 시 학부모님께 실시간으로 알림톡이 전송되는 지문 인식기가 설치되었습니다. 차량 등하원 경로 및 탑승 안전 수칙을 준수해 지도합니다.',
            date: '2026. 06. 05',
            author: '이공 원장',
            titleSize: 'normal',
            titleColor: 'default',
            pinned: false,
            highlight: false
        }
    ];

    let notices = defaultNotices;
    try {
        const stored = localStorage.getItem('gongbubang_notices');
        if (stored) {
            notices = JSON.parse(stored);
        }
    } catch (e) {
        console.error('localStorage is not accessible, using in-memory notices.', e);
    }
    
    let isAdmin = false;
    let isStudent = false;
    let loggedInStudentId = null;
    let userRole = null; // "admin" | "parent" | "student"
    let currentNoticeTag = 'all';
    let currentNoticeQuery = '';

    // Default homework dummy data
    const defaultHomework = [
        { id: 101, studentId: 1, dueDate: '2026-06-22', title: '디딤돌 수학 5-2 12단원', description: '45~50쪽 풀기 및 채점', isCompleted: false },
        { id: 102, studentId: 1, dueDate: '2026-06-21', title: '연산 학습지 14일차', description: '연산 오답 분석 5문항 풀이노트 작성', isCompleted: true },
        { id: 103, studentId: 2, dueDate: '2026-06-22', title: '체크체크 중학수학 1-2', description: '기하 작도 연습문제 5문항 풀기', isCompleted: false }
    ];

    // Default chat messages dummy data
    const defaultMessages = [
        { id: 201, studentId: 1, sender: 'parent', text: '선생님, 오늘 민준이가 연산 교재를 집에 두고 가서 공부방용 여분 프린트로 수업 진행 가능할까요?', time: '오후 1:40' },
        { id: 202, studentId: 1, sender: 'teacher', text: '어머님 안녕하세요! 네, 공부방에 민준이 진도용 예비 프린트 준비해 두었으니 걱정하지 않으셔도 됩니다. 오늘 등원하면 풀이노트 작성 집중적으로 지도하겠습니다.', time: '오후 1:45' }
    ];

    // Default feedback dummy data
    const defaultFeedbacks = [
        { id: 301, studentId: 1, date: '2026-06-22', content: '디딤돌 수학 5-2 분수의 곱셈 단원에서 기약분수로 나타내는 연산 실수가 종종 보이나, 개념은 완벽히 이해하고 있습니다.' },
        { id: 302, studentId: 1, date: '2026-06-19', content: '오늘 서술형 문제 풀이 시, 풀이 과정 줄을 맞춰 쓰는 훈련을 진행했습니다. 차분하게 잘 따라왔습니다.' },
        { id: 303, studentId: 2, date: '2026-06-22', content: '중등 수학 기하 파트 중 작도 단원 진행 중입니다. 컴퍼스 사용이 미숙했으나 오늘 실습을 통해 원리를 터득했습니다.' }
    ];

    // Default progress dummy data
    const defaultProgressList = [
        { id: 401, studentId: 1, date: '2026-06-22', content: '디딤돌 수학 5-2 기본 - 3단원 합동과 대칭 개념 강의 및 기본 유형 1~12번 풀이 진행' },
        { id: 402, studentId: 1, date: '2026-06-19', content: '디딤돌 수학 5-2 기본 - 2단원 분수의 나눗셈 단원평가 및 오답 클리닉 (92점)' },
        { id: 403, studentId: 2, date: '2026-06-22', content: '체크체크 수학 중 1-2 - 1단원 기본 도형 위치 관계 개념 교안 풀이완료' }
    ];

    // Default attendance dummy data
    const defaultAttendance = [
        { id: 501, studentId: 1, date: '2026-06-22', type: 'in', time: '15:30' },
        { id: 502, studentId: 1, date: '2026-06-22', type: 'out', time: '17:00' },
        { id: 503, studentId: 1, date: '2026-06-19', type: 'in', time: '15:35' },
        { id: 504, studentId: 1, date: '2026-06-19', type: 'out', time: '17:02' },
        { id: 505, studentId: 1, date: '2026-06-15', type: 'absent', time: '', memo: '개인 사정 결석' },
        { id: 506, studentId: 1, date: '2026-06-20', type: 'makeup', time: '14:00', memo: '6/15 결석 보강' }
    ];

    // Default consultations dummy data
    const defaultConsultations = [
        { id: 901, name: '홍길동', phone: '010-1234-5678', school: '이공초등학교', grade: '초등 5학년', memo: '연산 기초가 부족하고 소수 나눗셈을 어려워해서 학원 진도를 따라갈 수 있을지 걱정입니다.', date: '2026-06-24', status: 'pending' },
        { id: 902, name: '이순신 학부모', phone: '010-9876-5432', school: '이공중학교', grade: '중등 2학년', memo: '중등 서술형 문제 대비와 심화 서술 풀이 요령을 배우기 위해 수강 문의 드립니다.', date: '2026-06-23', status: 'completed' }
    ];

    // Default AI Queries dummy data
    const defaultAiQueries = [
        {
            id: 1719273600000,
            studentId: 1,
            studentName: '김민준',
            question: 'x^2 - 5x + 6 = 0의 풀이과정을 알려줘',
            answer: '이차방정식 \\(x^2 - 5x + 6 = 0\\)의 풀이과정입니다.\n\n**1. 인수분해를 이용한 풀이:**\n방정식을 인수분해하기 위해 곱해서 \\(+6\\), 더해서 \\(-5\\)가 되는 두 정수를 찾습니다. 두 수는 \\(-2\\)와 \\(-3\\)입니다.\n\\[(x - 2)(x - 3) = 0\\]\n따라서 해는 다음과 같습니다.\n\\[x = 2 \\quad \\text{또는} \\quad x = 3\\]\n\n**2. 근의 공식을 이용한 풀이:**\n이차방정식 근의 공식은 다음과 같습니다.\n\\[x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}\\]\n여기서 \\(a = 1, b = -5, c = 6\\)을 대입합니다.\n\\[x = \\frac{5 \\pm \\sqrt{(-5)^2 - 4 \\cdot 1 \\cdot 6}}{2 \\cdot 1}\\]\n\\[x = \\frac{5 \\pm \\sqrt{25 - 24}}{2} = \\frac{5 \\pm 1}{2}\\]\n\\[x_1 = \\frac{6}{2} = 3, \\quad x_2 = \\frac{4}{2} = 2\\]\n결과는 동일하게 \\(x = 2\\) 또는 \\(x = 3\\)입니다.',
            date: '2026-06-25',
            timestamp: '09:12:44'
        },
        {
            id: 1719273650000,
            studentId: 1,
            studentName: '김민준',
            question: '피타고라스 정리 공식이 뭐야?',
            answer: '**피타고라스 정리(Pythagorean Theorem)**는 직각삼각형에서 세 변의 길이 사이의 관계를 나타내는 기하학의 기본 정리입니다.\n\n**공식:**\n\\[a^2 + b^2 = c^2\\]\n- \\(a\\), \\(b\\): 직각을 끼고 있는 두 변의 길이 (밑변과 높이)\n- \\(c\\): 직각삼각형의 가장 긴 변인 **빗변**의 길이\n\n**설명:**\n직각삼각형에서 빗변의 길이를 제곱한 값은 나머지 두 변의 길이를 각각 제곱하여 더한 값과 같습니다.\n예를 들어, 두 변의 길이가 각각 \\(3\\text{cm}\\), \\(4\\text{cm}\\)인 직각삼각형의 빗변 길이 \\(c\\)는 다음과 같이 구합니다.\n\\[3^2 + 4^2 = c^2\\]\n\\[9 + 16 = c^2\\]\n\\[25 = c^2 \\implies c = 5\\text{cm}\\]',
            date: '2026-06-25',
            timestamp: '09:15:10'
        },
        {
            id: 1719187200000,
            studentId: 2,
            studentName: '이서윤',
            question: '삼각함수 sin(30도)의 값은?',
            answer: '특수각인 30도(\\(\\frac{\\pi}{6}\\) 라디안)에 대한 삼각비의 값은 다음과 같습니다.\n\n\\[\\sin(30^\\circ) = \\frac{1}{2} = 0.5\\]\n\n**설명:**\n한 각이 \\(30^\\circ\\), 다른 각이 \\(60^\\circ\\)인 직각삼각형에서 세 변의 길이 비는 다음과 같습니다.\n\\[\\text{높이} : \\text{밑변} : \\text{빗변} = 1 : \\sqrt{3} : 2\\]\n사인(\\(\\sin\\))의 정의는 **빗변 분의 높이**이므로 다음과 같이 유도됩니다.\n\\[\\sin(30^\\circ) = \\frac{\\text{높이}}{\\text{빗변}} = \\frac{1}{2}\\]',
            date: '2026-06-24',
            timestamp: '16:45:12'
        }
    ];

    // Default curriculums dummy data
    const defaultCurriculums = [
        {
            id: 1,
            stepNum: '01',
            title: '초집중 연산 & 기초개념반',
            description: '실수 없는 확실한 연산 능력을 극대화하여 수학의 자신감을 키웁니다. 시각적 개념 모델을 통한 쉽고 깊이 있는 기본 개념 수업입니다.',
            targets: ['연산 속도 개선', '정확도 향상', '교과 개념 기초']
        },
        {
            id: 2,
            stepNum: '02',
            title: '내신만점 서술형 & 유형분석반',
            description: '단순 수식 계산을 넘어 문제 속 의도를 분석하고 빈틈없는 서술형 답안을 논리적으로 도출하는 논술형 풀이 훈련입니다.',
            targets: ['오답노트 클리닉', '논술식 풀이', '시험 만점 대비']
        },
        {
            id: 3,
            stepNum: '03',
            title: '상위 1% 심화 & 최고난도반',
            description: '경시대회 문항, 영재고 대비 및 응용 융합 문제들을 다루며 한 문제에 30분 이상 스스로 고민하고 돌파구를 찾는 수학적 사고력을 훈련합니다.',
            targets: ['킬러 문항 정복', '수학적 문제해결력', '영재 사고력']
        }
    ];

    let homework = defaultHomework;
    let messages = defaultMessages;
    let feedbacks = defaultFeedbacks;
    let progressList = defaultProgressList;
    let attendance = defaultAttendance;
    let consultations = defaultConsultations;
    let curriculums = defaultCurriculums;
    let aiQueries = defaultAiQueries;

    try {
        const storedHw = localStorage.getItem('gongbubang_homework');
        if (storedHw) homework = JSON.parse(storedHw);
        else localStorage.setItem('gongbubang_homework', JSON.stringify(defaultHomework));

        const storedMsg = localStorage.getItem('gongbubang_messages');
        if (storedMsg) messages = JSON.parse(storedMsg);
        else localStorage.setItem('gongbubang_messages', JSON.stringify(defaultMessages));

        const storedFb = localStorage.getItem('gongbubang_feedbacks');
        if (storedFb) feedbacks = JSON.parse(storedFb);
        else localStorage.setItem('gongbubang_feedbacks', JSON.stringify(defaultFeedbacks));

        const storedProg = localStorage.getItem('gongbubang_progress');
        if (storedProg) progressList = JSON.parse(storedProg);
        else localStorage.setItem('gongbubang_progress', JSON.stringify(defaultProgressList));

        const storedAtt = localStorage.getItem('gongbubang_attendance');
        if (storedAtt) attendance = JSON.parse(storedAtt);
        else localStorage.setItem('gongbubang_attendance', JSON.stringify(defaultAttendance));

        const storedConsult = localStorage.getItem('gongbubang_consultations');
        if (storedConsult) consultations = JSON.parse(storedConsult);
        else localStorage.setItem('gongbubang_consultations', JSON.stringify(defaultConsultations));

        const storedCurriculum = localStorage.getItem('gongbubang_curriculums');
        if (storedCurriculum) curriculums = JSON.parse(storedCurriculum);
        else localStorage.setItem('gongbubang_curriculums', JSON.stringify(defaultCurriculums));

        const storedAiQueries = localStorage.getItem('gongbubang_ai_queries');
        if (storedAiQueries) aiQueries = JSON.parse(storedAiQueries);
        else localStorage.setItem('gongbubang_ai_queries', JSON.stringify(defaultAiQueries));
    } catch (e) {
        console.error('localStorage is not accessible for state tables.', e);
    }

    const saveHomework = () => {
        try { localStorage.setItem('gongbubang_homework', JSON.stringify(homework)); } catch(e){}
    };
    const saveFeedbacks = () => {
        try { localStorage.setItem('gongbubang_feedbacks', JSON.stringify(feedbacks)); } catch(e){}
    };
    const saveProgressList = () => {
        try { localStorage.setItem('gongbubang_progress', JSON.stringify(progressList)); } catch(e){}
    };
    const saveMessages = () => {
        try { localStorage.setItem('gongbubang_messages', JSON.stringify(messages)); } catch(e){}
    };
    const saveAttendance = () => {
        try { localStorage.setItem('gongbubang_attendance', JSON.stringify(attendance)); } catch(e){}
    };
    const saveConsultations = () => {
        try { localStorage.setItem('gongbubang_consultations', JSON.stringify(consultations)); } catch(e){}
    };
    const saveCurriculums = () => {
        try { localStorage.setItem('gongbubang_curriculums', JSON.stringify(curriculums)); } catch(e){}
    };
    
    // Default classes dummy data
    const defaultClasses = [
        {
            id: 1,
            name: '초등 4학년 A반',
            duration: 90,
            schedule: {
                mon: '14:00 ~ 15:30',
                tue: '',
                wed: '14:00 ~ 15:30',
                thu: '',
                fri: '14:00 ~ 15:30'
            }
        },
        {
            id: 2,
            name: '중등 1학년 A반',
            duration: 90,
            schedule: {
                mon: '',
                tue: '17:00 ~ 18:30',
                wed: '',
                thu: '17:00 ~ 18:30',
                fri: ''
            }
        },
        {
            id: 3,
            name: '초등 1학년 A반',
            duration: 90,
            schedule: {
                mon: '',
                tue: '15:30 ~ 17:00',
                wed: '',
                thu: '15:30 ~ 17:00',
                fri: ''
            }
        }
    ];

    let classes = defaultClasses;

    // Load classes from localStorage
    try {
        const storedClasses = localStorage.getItem('gongbubang_classes');
        if (storedClasses) {
            const parsed = JSON.parse(storedClasses);
            if (Array.isArray(parsed)) {
                classes = parsed.filter(c => c && typeof c === 'object');
                if (!classes.some(c => c.id === 3)) {
                    classes.push({
                        id: 3,
                        name: '초등 1학년 A반',
                        schedule: {
                            mon: '',
                            tue: '15:30 ~ 17:00',
                            wed: '',
                            thu: '15:30 ~ 17:00',
                            fri: ''
                        }
                    });
                    localStorage.setItem('gongbubang_classes', JSON.stringify(classes));
                }
            } else {
                localStorage.setItem('gongbubang_classes', JSON.stringify(defaultClasses));
            }
        } else {
            localStorage.setItem('gongbubang_classes', JSON.stringify(defaultClasses));
        }
    } catch (e) {
        console.error('localStorage is not accessible for classes data.', e);
        classes = defaultClasses;
    }

    const getEarliestTime = (c) => {
        let earliest = '23:59';
        const days = ['mon', 'tue', 'wed', 'thu', 'fri'];
        days.forEach(day => {
            const timeRange = c.schedule?.[day];
            if (timeRange && timeRange !== '-') {
                const start = timeRange.split('~')[0].trim();
                if (start && start.length >= 5 && start < earliest) {
                    earliest = start;
                }
            }
        });
        return earliest;
    };

    const getClassTimeRange = (c) => {
        const days = ['mon', 'tue', 'wed', 'thu', 'fri'];
        for (const day of days) {
            const val = c.schedule?.[day];
            if (val && val !== '-') return val;
        }
        return '-';
    };

    const renderMainScheduleTable = () => {
        const tbody = document.getElementById('main-schedule-tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        
        if (!Array.isArray(classes) || classes.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="padding: 24px; color: var(--text-secondary);">등록된 수업 스케줄이 없습니다.</td></tr>`;
            return;
        }

        const sortedClasses = [...classes].sort((a, b) => {
            const timeA = getEarliestTime(a);
            const timeB = getEarliestTime(b);
            return timeA.localeCompare(timeB);
        });
        
        sortedClasses.forEach(c => {
            const tr = document.createElement('tr');
            
            // Show class name under the days it is scheduled, otherwise "-"
            const monText = (c.schedule?.mon && c.schedule.mon !== '-') ? c.name : '-';
            const tueText = (c.schedule?.tue && c.schedule.tue !== '-') ? c.name : '-';
            const wedText = (c.schedule?.wed && c.schedule.wed !== '-') ? c.name : '-';
            const thuText = (c.schedule?.thu && c.schedule.thu !== '-') ? c.name : '-';
            const friText = (c.schedule?.fri && c.schedule.fri !== '-') ? c.name : '-';
            const timeRange = getClassTimeRange(c);
            
            tr.innerHTML = `
                <td class="time-slot" style="font-weight: 600; text-align: left; padding-left: 20px;">${timeRange}</td>
                <td>${monText}</td>
                <td>${tueText}</td>
                <td>${wedText}</td>
                <td>${thuText}</td>
                <td>${friText}</td>
                <td style="font-weight: 500; color: var(--text-secondary);">${c.duration || 90}분</td>
            `;
            tbody.appendChild(tr);
        });
    };

    const saveClasses = () => {
        try { 
            localStorage.setItem('gongbubang_classes', JSON.stringify(classes)); 
            renderMainScheduleTable();
        } catch(e){}
    };

    let currentCalStudentId = null;
    let currentCalYear = null;
    let currentCalMonth = null;
    let myClassCalYear = null;
    let myClassCalMonth = null;



    // Elements
    const noticeListContainer = document.getElementById('notice-list-container');
    const btnLoginToggle = document.getElementById('btn-login-toggle');
    const btnAdminToggle = btnLoginToggle;
    const btnAdminWrite = document.getElementById('btn-admin-write');
    
    // Auth Modal Elements
    const adminAuthModal = document.getElementById('admin-auth-modal');
    const btnAuthClose = document.getElementById('btn-auth-close');
    const adminAuthForm = document.getElementById('admin-auth-form');
    const adminPasswordInput = document.getElementById('admin-password-input');
    const authErrorMsg = document.getElementById('auth-error-msg');
    
    // Notice Editor Modal Elements
    const noticeFormModal = document.getElementById('notice-form-modal');
    const btnFormClose = document.getElementById('btn-form-close');
    const noticeEditorForm = document.getElementById('notice-editor-form');
    const editNoticeIdInput = document.getElementById('edit-notice-id');
    const noticeTagSelect = document.getElementById('notice-tag-select');
    const noticeSizeSelect = document.getElementById('notice-size-select');
    const noticeColorSelect = document.getElementById('notice-color-select');
    const noticePinCheckbox = document.getElementById('notice-pin-checkbox');
    const noticeTitleInput = document.getElementById('notice-title-input');
    const noticeContentInput = document.getElementById('notice-content-input');
    const formModalTitle = document.getElementById('form-modal-title');

    // Safe localStorage Write
    const saveNotices = () => {
        try {
            localStorage.setItem('gongbubang_notices', JSON.stringify(notices));
        } catch (e) {
            console.error('Failed to save to localStorage.', e);
        }
    };

    // Format current date (YYYY. MM. DD)
    const getFormattedDate = () => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const date = String(d.getDate()).padStart(2, '0');
        return `${year}. ${month}. ${date}`;
    };

    // Dynamic renderer for Notice cards
    const renderNotices = () => {
        if (!noticeListContainer) return;

        // Apply filters
        const query = (currentNoticeQuery || '').trim().toLowerCase();
        const filteredNotices = notices.filter(notice => {
            const matchesTag = currentNoticeTag === 'all' || notice.tag === currentNoticeTag;
            const matchesQuery = !query || 
                                 notice.title.toLowerCase().includes(query) || 
                                 notice.content.toLowerCase().includes(query);
            return matchesTag && matchesQuery;
        });

        // Dynamic sorting: Pinned notices go first, then sorted by ID descending
        filteredNotices.sort((a, b) => {
            const aPinned = a.pinned ? 1 : 0;
            const bPinned = b.pinned ? 1 : 0;
            if (aPinned !== bPinned) {
                return bPinned - aPinned;
            }
            return b.id - a.id;
        });

        noticeListContainer.innerHTML = '';
        
        if (filteredNotices.length === 0) {
            noticeListContainer.innerHTML = `
                <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
                    검색 결과에 맞는 공지사항이 없습니다.
                </div>
            `;
            return;
        }

        filteredNotices.forEach(notice => {
            const article = document.createElement('article');
            article.className = `notice-card ${notice.pinned ? 'highlight' : ''}`;
            
            let tagClass = '';
            if (notice.tag === '공지' || notice.tag === '안내') {
                tagClass = 'tag-gray';
            }

            let adminControls = '';
            if (isAdmin) {
                adminControls = `
                    <div class="notice-admin-actions">
                        <button class="btn-notice-edit" data-id="${notice.id}" title="수정"><i data-lucide="edit-3"></i></button>
                        <button class="btn-notice-delete" data-id="${notice.id}" title="삭제"><i data-lucide="trash-2"></i></button>
                    </div>
                `;
            }

            let titleStyles = [];
            const tSize = notice.titleSize || 'normal';
            const tColor = notice.titleColor || 'default';

            if (tSize === 'large') {
                titleStyles.push('font-size: 1.35rem');
            } else if (tSize === 'xlarge') {
                titleStyles.push('font-size: 1.6rem');
            } else {
                titleStyles.push('font-size: 1.1rem');
            }

            if (tColor === 'blue') {
                titleStyles.push('color: #18181b');
            } else if (tColor === 'red') {
                titleStyles.push('color: #52525b');
            } else if (tColor === 'green') {
                titleStyles.push('color: #71717a');
            } else if (tColor === 'purple') {
                titleStyles.push('color: #a1a1aa');
            }

            const styleString = titleStyles.length > 0 ? `style="${titleStyles.join('; ')}"` : '';
            const pinIconHtml = notice.pinned ? `<i data-lucide="pin" style="width: 14px; height: 14px; color: var(--mascot-red-bg); vertical-align: middle; margin-right: 4px; transform: rotate(45deg);"></i>` : '';

            article.innerHTML = `
                <div class="notice-tag ${tagClass}">${notice.tag}</div>
                <div class="notice-body">
                    <h3 class="notice-title"><a href="#" onclick="return false;" ${styleString}>${pinIconHtml}${notice.title}</a></h3>
                    <p class="notice-summary" style="white-space: pre-line;">${notice.content}</p>
                    <div class="notice-meta">
                        <span class="notice-date"><i data-lucide="clock"></i> ${notice.date}</span>
                        <span class="notice-author">작성자: ${notice.author}</span>
                    </div>
                </div>
                ${adminControls}
            `;
            noticeListContainer.appendChild(article);
        });

        safeCreateIcons();
        attachCardListeners();
    };

    // Card edit/delete listeners
    const attachCardListeners = () => {
        if (!isAdmin) return;

        const editBtns = document.querySelectorAll('#notice-list-container .btn-notice-edit');
        const deleteBtns = document.querySelectorAll('#notice-list-container .btn-notice-delete');

        editBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = parseInt(btn.getAttribute('data-id'));
                const noticeToEdit = notices.find(n => n.id === id);
                if (noticeToEdit && editNoticeIdInput && noticeTagSelect && noticeTitleInput && noticeContentInput && formModalTitle && noticeFormModal) {
                    editNoticeIdInput.value = noticeToEdit.id;
                    noticeTagSelect.value = noticeToEdit.tag;
                    if (noticeSizeSelect) noticeSizeSelect.value = noticeToEdit.titleSize || 'normal';
                    if (noticeColorSelect) noticeColorSelect.value = noticeToEdit.titleColor || 'default';
                    if (noticePinCheckbox) noticePinCheckbox.checked = noticeToEdit.pinned || false;
                    noticeTitleInput.value = noticeToEdit.title;
                    noticeContentInput.value = noticeToEdit.content;
                    formModalTitle.textContent = '공지사항 수정';
                    noticeFormModal.classList.add('open');
                }
            });
        });

        deleteBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = parseInt(btn.getAttribute('data-id'));
                if (confirm('이 공지사항을 정말 삭제하시겠습니까?')) {
                    notices = notices.filter(n => n.id !== id);
                    saveNotices();
                    renderNotices();
                    showToast('공지사항이 삭제되었습니다.');
                }
            });
        });
    };

    // ==========================================================================
    // Student LMS Panel (Admin Only Features)
    // ==========================================================================
    const defaultStudents = [
        {
            id: 1,
            name: '김민준',
            age: 11,
            school: '이공초 4학년',
            phone: '010-1234-5678',
            parentPhone: '010-9876-5432',
            sibling: '여동생 8세',
            classId: 1,
            schedule: {
                mon: '14:00',
                tue: '',
                wed: '14:00',
                thu: '',
                fri: ''
            },
            progress: '디딤돌 기본+응용 5-2 (12단원 분수의 곱셈)',
            remarks: '수학적 직관 및 서술형 논리력이 매우 뛰어남. 가끔 서둘러 푸는 버릇으로 인한 연산 실수가 있으므로 검산 습관 지도 중.'
        },
        {
            id: 2,
            name: '이서윤',
            age: 14,
            school: '이공중 1학년',
            phone: '010-2222-3333',
            parentPhone: '010-4444-5555',
            sibling: '없음',
            classId: 2,
            schedule: {
                mon: '',
                tue: '17:00',
                wed: '',
                thu: '17:00',
                fri: ''
            },
            progress: '체크체크 중학 수학 1-2 (기하 작도/성질)',
            remarks: '도형 입체 형태 회전단원 오답 오인도가 높아 추가 개별 교구 첨삭 진행 완료. 풀이 노트를 깔끔하고 체계적으로 정돈하는 능력이 우수함.'
        },
        {
            id: 3,
            name: '김서아',
            age: 8,
            school: '이공초 1학년',
            phone: '010-5555-6666',
            parentPhone: '010-9876-5432',
            sibling: '오빠 11세',
            classId: 3,
            schedule: {
                mon: '',
                tue: '15:30',
                wed: '',
                thu: '15:30',
                fri: ''
            },
            progress: '디딤돌 초등 수학 1-2',
            remarks: '이제 막 공부방에 합류한 학생입니다. 한글 읽기 및 10 이하의 덧뺄셈이 유창함.'
        }
    ];

    let students = defaultStudents;
    try {
        const stored = localStorage.getItem('gongbubang_students');
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
                students = parsed.filter(s => s && typeof s === 'object');
                let updated = false;
                students = students.map(s => {
                    if (s.classId === undefined || s.classId === null) {
                        updated = true;
                        if (s.name === '김민준') return { ...s, classId: 1 };
                        if (s.name === '이서윤') return { ...s, classId: 2 };
                        if (s.name === '김서아') return { ...s, classId: 3 };
                    }
                    return s;
                });
                if (updated) {
                    localStorage.setItem('gongbubang_students', JSON.stringify(students));
                }
            } else {
                localStorage.setItem('gongbubang_students', JSON.stringify(defaultStudents));
            }
        }
    } catch (e) {
        console.error('localStorage is not accessible for students data.', e);
        students = defaultStudents;
    }

    // Student DOM Elements
    const studentSection = document.getElementById('students');
    const studentGridContainer = document.getElementById('student-grid-container');
    const studentSearchInput = document.getElementById('student-search-input');
    const btnStudentWrite = document.getElementById('btn-student-write');
    // Student View State
    let currentStudentView = 'active'; // 'active' or 'terminated'
    let currentTerminatedYear = 'all'; // 'all' or specific year

    // Student DOM Elements
    const navLinkStudents = document.getElementById('nav-link-students');
    const drawerLinkStudents = document.getElementById('drawer-link-students');

    // Student Modal Elements
    const studentFormModal = document.getElementById('student-form-modal');
    const btnStudentFormClose = document.getElementById('btn-student-form-close');
    const studentEditorForm = document.getElementById('student-editor-form');
    const editStudentIdInput = document.getElementById('edit-student-id');
    const studentNameInput = document.getElementById('student-name-input');
    const studentAgeInput = document.getElementById('student-age-input');
    const studentSchoolInput = document.getElementById('student-school-input');
    const studentPhoneInput = document.getElementById('student-phone-input');
    const studentParentPhoneInput = document.getElementById('student-parent-phone-input');
    const studentSiblingInput = document.getElementById('student-sibling-input');
    const studentClassDurationInput = document.getElementById('student-class-duration');
    const studentTimeMonStart = document.getElementById('student-time-mon-start');
    const studentTimeMonEnd = document.getElementById('student-time-mon-end');
    const studentTimeTueStart = document.getElementById('student-time-tue-start');
    const studentTimeTueEnd = document.getElementById('student-time-tue-end');
    const studentTimeWedStart = document.getElementById('student-time-wed-start');
    const studentTimeWedEnd = document.getElementById('student-time-wed-end');
    const studentTimeThuStart = document.getElementById('student-time-thu-start');
    const studentTimeThuEnd = document.getElementById('student-time-thu-end');
    const studentTimeFriStart = document.getElementById('student-time-fri-start');
    const studentTimeFriEnd = document.getElementById('student-time-fri-end');
    const studentProgressInput = document.getElementById('student-progress-input');
    const studentRemarksInput = document.getElementById('student-remarks-input');
    const studentTerminatedCheckbox = document.getElementById('student-terminated-checkbox');
    const studentTerminationDateInput = document.getElementById('student-termination-date-input');
    const studentFormModalTitle = document.getElementById('student-form-modal-title');

    const populateTerminationYears = () => {
        const yearFilter = document.getElementById('terminated-year-filter');
        if (!yearFilter) return;
        
        const years = new Set();
        students.forEach(s => {
            if (s.isTerminated && s.terminationDate) {
                const year = new Date(s.terminationDate).getFullYear();
                if (year && !isNaN(year)) {
                    years.add(year);
                }
            }
        });
        
        const sortedYears = Array.from(years).sort((a, b) => b - a);
        const prevVal = yearFilter.value || 'all';
        
        yearFilter.innerHTML = '<option value="all">전체 년도</option>';
        sortedYears.forEach(y => {
            const opt = document.createElement('option');
            opt.value = String(y);
            opt.textContent = `${y}년`;
            yearFilter.appendChild(opt);
        });
        
        if (sortedYears.includes(Number(prevVal))) {
            yearFilter.value = prevVal;
        } else {
            yearFilter.value = 'all';
            currentTerminatedYear = 'all';
        }
    };

    const updateTotalStudentsCount = () => {
        const countEl = document.getElementById('total-students-count');
        if (countEl) {
            const activeStudents = students.filter(s => !s.isTerminated);
            countEl.textContent = `${activeStudents.length}명`;
        }
    };

    // Safe localStorage Write for students
    const saveStudents = () => {
        try {
            localStorage.setItem('gongbubang_students', JSON.stringify(students));
            updateTotalStudentsCount();
        } catch (e) {
            console.error('Failed to save students to localStorage.', e);
        }
    };

    // Render Student Cards
    const renderStudents = (searchQuery = '') => {
        if (!studentGridContainer) return;
        studentGridContainer.innerHTML = '';

        const query = searchQuery.trim().toLowerCase();
        const classFilterEl = document.getElementById('student-class-filter');
        const classFilterVal = classFilterEl ? classFilterEl.value : '';

        const filteredStudents = students.filter(s => {
            const matchesSearch = s.name.toLowerCase().includes(query);
            
            if (currentStudentView === 'active') {
                if (s.isTerminated) return false;
                const matchesClass = !classFilterVal || String(s.classId) === String(classFilterVal);
                return matchesSearch && matchesClass;
            } else {
                if (!s.isTerminated) return false;
                
                if (currentTerminatedYear !== 'all') {
                    const terminationYear = s.terminationDate ? new Date(s.terminationDate).getFullYear() : null;
                    if (String(terminationYear) !== String(currentTerminatedYear)) {
                        return false;
                    }
                }
                return matchesSearch;
            }
        });

        if (filteredStudents.length === 0) {
            studentGridContainer.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-secondary);">
                    ${searchQuery ? '검색 결과에 맞는 원생이 없습니다.' : '등록된 원생 카드가 없습니다.'}
                </div>
            `;
            return;
        }

        filteredStudents.forEach(student => {
            const card = document.createElement('div');
            card.className = 'student-card';

            const siblingTag = student.sibling && student.sibling !== '없음' && student.sibling !== '무' ? `<span class="student-sibling-tag">${student.sibling}</span>` : '';

            const studentClass = student.classId ? classes.find(c => String(c.id) === String(student.classId)) : null;
            const classNameTag = studentClass ? `<br><span style="font-size: 0.72rem; font-weight: 700; color: var(--mascot-purple-bg); background: rgba(142, 68, 173, 0.08); padding: 2px 6px; border-radius: 6px; margin-top: 4px; display: inline-block;">${studentClass.name}</span>` : '';

            // Weekly schedule calculations
            const days = ['mon', 'tue', 'wed', 'thu', 'fri'];
            const dayLabels = { mon: '월', tue: '화', wed: '수', thu: '목', fri: '금' };
            let scheduleHtml = '';

            const studentSchedule = getStudentSchedule(student);
            days.forEach(day => {
                const timeVal = studentSchedule[day] || '';
                const isEmpty = !timeVal;
                scheduleHtml += `
                    <div class="day-slot">
                        <span class="day-label">${dayLabels[day]}</span>
                        <span class="day-time ${isEmpty ? 'empty' : ''}">${isEmpty ? '-' : timeVal}</span>
                    </div>
                `;
            });

            // Calculate homework count
            const studentHomework = homework.filter(h => h.studentId === student.id);
            const totalHw = studentHomework.length;
            const completedHw = studentHomework.filter(h => h.isCompleted).length;
            const hwStatusHtml = totalHw > 0 
                ? `<span style="color: #18181b; font-weight: 700;">완료 ${completedHw}개 / 전체 ${totalHw}개</span>` 
                : `<span style="color: var(--text-muted); font-weight: normal;">배정된 과제 없음</span>`;

            // Calculate attendance logs (today)
            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            const todayStr = `${yyyy}-${mm}-${dd}`;

            const studentAttendance = attendance.filter(a => a.studentId === student.id && (a.date === todayStr || !a.date));
            
            // Check if there is a scheduled class for today
            const dayOfWeek = today.getDay();
            const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
            const dayKey = dayKeys[dayOfWeek];
            const scheduleTime = (dayOfWeek >= 1 && dayOfWeek <= 5) ? studentSchedule[dayKey] : '';

            let virtualStudentAttendance = [...studentAttendance];
            if (scheduleTime) {
                const hasAny = studentAttendance.some(log => log.type === 'in' || log.type === 'out' || log.type === 'absent' || log.type === 'makeup');
                if (!hasAny) {
                    virtualStudentAttendance.push({
                        type: 'in',
                        time: '',
                        memo: '자동 출석'
                    });
                }
            }

            let attendanceLogsHtml = '';
            virtualStudentAttendance.forEach(log => {
                let typeText = '출석';
                let tagClass = 'in';
                if (log.type === 'in') { typeText = '출석'; tagClass = 'in'; }
                else if (log.type === 'out') { typeText = '출석'; tagClass = 'in'; }
                else if (log.type === 'absent') { typeText = '결석'; tagClass = 'absent'; }
                else if (log.type === 'makeup') { typeText = '보강'; tagClass = 'makeup'; }

                const timeInfo = '';
                const memoInfo = log.memo ? ` (${log.memo})` : '';
                const isAuto = log.memo === '자동 출석';
                const smsInfo = isAuto ? '' : ' (안심문자 전송완료)';
                attendanceLogsHtml += `
                    <div style="margin-top: 4px;">
                        <span class="attendance-log-tag ${tagClass}">${typeText}</span>${timeInfo}${memoInfo}${smsInfo}
                    </div>
                `;
            });
            if (virtualStudentAttendance.length === 0) {
                attendanceLogsHtml = '<div style="color: var(--text-muted); font-size: 0.78rem;">오늘 출결 기록 없음</div>';
            }

            // Calculate feedbacks list (timeline newest first)
            const studentFeedbacks = feedbacks
                .filter(f => f.studentId === student.id)
                .sort((a, b) => new Date(b.date) - new Date(a.date));
            let feedbacksHtml = '';
            studentFeedbacks.forEach(fb => {
                feedbacksHtml += `
                    <div class="feedback-item" style="margin-top: 6px; border-bottom: 1px dashed var(--border-color); padding-bottom: 6px;">
                        <span style="font-size: 0.72rem; font-weight: 700; color: var(--mascot-purple-bg); background: rgba(142, 68, 173, 0.08); padding: 1px 5px; border-radius: 4px; display: inline-block; margin-bottom: 2px;">${fb.date}</span>
                        <div style="font-size: 0.8rem; color: var(--text-secondary); line-height: 1.4; white-space: pre-wrap;">${fb.content}</div>
                    </div>
                `;
            });
            if (studentFeedbacks.length === 0) {
                feedbacksHtml = '<div style="color: var(--text-muted); font-size: 0.8rem;">피드백 기록이 없습니다.</div>';
            }

            // Calculate progress list (timeline newest first)
            const studentProgressList = progressList
                .filter(p => p.studentId === student.id)
                .sort((a, b) => new Date(b.date) - new Date(a.date));
            let progressListHtml = '';
            studentProgressList.forEach(prog => {
                progressListHtml += `
                    <div class="progress-item" style="margin-top: 6px; border-bottom: 1px dashed var(--border-color); padding-bottom: 6px;">
                        <span style="font-size: 0.72rem; font-weight: 700; color: var(--mascot-green-bg); background: rgba(39, 39, 42, 0.08); padding: 1px 5px; border-radius: 4px; display: inline-block; margin-bottom: 2px;">${prog.date}</span>
                        <div style="font-size: 0.8rem; color: var(--text-secondary); line-height: 1.4; white-space: pre-wrap;">${prog.content}</div>
                    </div>
                `;
            });
            if (studentProgressList.length === 0) {
                progressListHtml = '<div style="color: var(--text-muted); font-size: 0.8rem;">진도 기록이 없습니다.</div>';
            }

            const terminationTag = student.isTerminated 
                ? `<span style="font-size: 0.72rem; font-weight: 700; color: #ff4d4f; background: #fff2f0; border: 1px solid #ffccc7; padding: 2px 6px; border-radius: 6px; margin-top: 4px; display: inline-block;">종결 (${student.terminationDate || '날짜 미지정'})</span>`
                : '';

            card.innerHTML = `
                <div class="student-card-header">
                    <div class="student-info-title">
                        <h3>${student.name}</h3>
                        <span>${student.age}세 &middot; ${student.school}</span>
                        ${classNameTag}
                        ${terminationTag}
                    </div>
                    ${siblingTag}
                </div>
                <div class="student-contact-section">
                    <div class="student-contact-item">
                        <i data-lucide="smartphone" style="width: 14px; height: 14px; color: var(--primary-color);"></i>
                        <strong>학생 연락처:</strong> 
                        ${student.phone ? `<a href="tel:${student.phone}">${student.phone}</a>` : '없음'}
                    </div>
                    <div class="student-contact-item">
                        <i data-lucide="phone-call" style="width: 14px; height: 14px; color: var(--mascot-pink-bg);"></i>
                        <strong>부모님 연락처:</strong> 
                        <a href="tel:${student.parentPhone}">${student.parentPhone}</a>
                    </div>
                </div>
                <div class="student-schedule-timeline">
                    ${scheduleHtml}
                </div>
                <div class="student-progress-box">
                    <h4><i data-lucide="book-open" style="width: 14px; height: 14px; color: var(--mascot-green-bg);"></i>대표 교재 / 과정</h4>
                    <div class="student-progress-text" style="font-weight: 600; margin-bottom: 8px;">${student.progress}</div>
                    
                    <h4 style="font-size: 0.82rem; font-weight: 700; color: var(--text-primary); margin-top: 10px; margin-bottom: 6px; display: flex; align-items: center; gap: 6px; border-top: 1px dashed var(--border-color); padding-top: 8px;">
                        <i data-lucide="activity" style="width: 14px; height: 14px; color: var(--mascot-green-bg);"></i>진도 기록 히스토리
                    </h4>
                    <div class="student-progress-history-list" style="max-height: 150px; overflow-y: auto; padding-right: 4px;">
                        ${progressListHtml}
                    </div>
                </div>
                <div class="student-progress-box" style="margin-top: 12px;">
                    <h4 style="font-size: 0.82rem; font-weight: 700; color: var(--text-primary); margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
                        <i data-lucide="check-square" style="width: 14px; height: 14px; color: var(--mascot-pink-bg);"></i>과제 수행 현황
                    </h4>
                    <div style="font-size: 0.84rem;">
                        ${hwStatusHtml}
                    </div>
                </div>
                <div class="student-remarks-box">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; gap: 8px; flex-wrap: wrap;">
                        <h4 style="margin: 0; display: flex; align-items: center; gap: 4px;"><i data-lucide="file-edit" style="width: 14px; height: 14px; color: var(--text-secondary);"></i>특이사항 및 피드백</h4>
                        <div style="position: relative; width: 120px;">
                            <input type="text" class="student-feedback-search" data-student-id="${student.id}" placeholder="피드백 검색..." style="width: 100%; padding: 4px 8px 4px 22px; border-radius: 4px; border: 1px solid var(--border-color); outline: none; font-size: 0.72rem; background: #ffffff;">
                            <i data-lucide="search" style="position: absolute; left: 6px; top: 50%; transform: translateY(-50%); width: 10px; height: 10px; color: var(--text-muted);"></i>
                        </div>
                    </div>
                    <div class="student-remarks-list" style="max-height: 150px; overflow-y: auto; padding-right: 4px;">
                        ${feedbacksHtml}
                    </div>
                </div>
                <div class="student-progress-box" style="margin-top: 12px; border-top: 1px dashed var(--border-color); padding-top: 12px;">
                    <h4 style="font-size: 0.82rem; font-weight: 700; color: var(--text-primary); margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
                        <i data-lucide="bell" style="width: 14px; height: 14px; color: var(--mascot-purple-bg);"></i>오늘의 출결 로그 (SMS 발송)
                    </h4>
                    <div class="attendance-logs-container">
                        ${attendanceLogsHtml}
                    </div>
                </div>
                <div style="display: flex; gap: 8px; margin-top: 14px; border-top: 1px dashed var(--border-color); padding-top: 14px; flex-wrap: wrap;">
                    <button class="btn-admin-mode btn-attendance-in" data-id="${student.id}" style="padding: 6px 12px; font-size: 0.78rem; flex-grow: 1;">출석 처리</button>
                    <button class="btn-admin-mode btn-attendance-out" data-id="${student.id}" style="padding: 6px 12px; font-size: 0.78rem; flex-grow: 1;">결석 처리</button>
                    <button class="btn-admin-write btn-assign-homework" data-id="${student.id}" style="padding: 6px 12px; font-size: 0.78rem; flex-grow: 1; background: var(--primary-color); border: none;">과제 출제</button>
                    <button class="btn-admin-write btn-write-progress" data-id="${student.id}" style="padding: 6px 12px; font-size: 0.78rem; flex-grow: 1; background: var(--mascot-green-bg); border: none;">진도 기록</button>
                    <button class="btn-admin-write btn-write-feedback" data-id="${student.id}" style="padding: 6px 12px; font-size: 0.78rem; flex-grow: 1; background: var(--mascot-purple-bg); border: none;">피드백 작성</button>
                    <button class="btn-admin-write btn-student-calendar" data-id="${student.id}" style="padding: 6px 12px; font-size: 0.78rem; flex-grow: 1; background: var(--mascot-pink-bg); border: none;">출결 달력</button>
                    <button class="btn-admin-mode btn-teacher-chat" data-id="${student.id}" style="padding: 6px 12px; font-size: 0.78rem; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; border-radius: 50%;"><i data-lucide="message-square" style="width: 14px; height: 14px;"></i></button>
                </div>
                <div class="notice-admin-actions">
                    <button class="btn-notice-edit btn-student-edit" data-id="${student.id}" title="수정"><i data-lucide="edit-3"></i></button>
                    <button class="btn-notice-delete btn-student-delete" data-id="${student.id}" title="삭제"><i data-lucide="trash-2"></i></button>
                </div>
            `;
            studentGridContainer.appendChild(card);
        });

        safeCreateIcons();
        attachStudentCardListeners();
    };


    // Render monthly calendar helper
    const renderCalendar = (studentId, year, month, containerId, isAdmin = false) => {
        const student = students.find(s => s.id === studentId);
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = '';

        let countPresent = 0;
        let countAbsent = 0;
        let countMakeup = 0;

        // Update year/month title
        if (containerId === 'calendar-grid-days') {
            const titleEl = document.getElementById('calendar-month-year');
            if (titleEl) titleEl.textContent = `${year}년 ${month + 1}월`;
        } else if (containerId === 'myclass-calendar-grid-days') {
            const titleEl = document.getElementById('myclass-calendar-month-year');
            if (titleEl) titleEl.textContent = `${year}년 ${month + 1}월`;
        }

        // Get first day of month and number of days
        const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun, 1 = Mon ...
        const totalDays = new Date(year, month + 1, 0).getDate();
        const prevTotalDays = new Date(year, month, 0).getDate();

        // Calculate total class days for this month (regular classes + makeup classes)
        let totalClassDays = 0;
        if (student) {
            for (let d = 1; d <= totalDays; d++) {
                const cellDate = new Date(year, month, d);
                const dayOfWeek = cellDate.getDay();
                const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
                const dayKey = dayKeys[dayOfWeek];
                const studentSchedule = getStudentSchedule(student);
                const scheduleTime = (dayOfWeek >= 1 && dayOfWeek <= 5) ? studentSchedule[dayKey] : '';
                
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const dateLogs = attendance.filter(a => a.studentId === studentId && a.date === dateStr);
                const hasMakeup = dateLogs.some(log => log.type === 'makeup');
                
                if (scheduleTime || hasMakeup) {
                    totalClassDays++;
                }
            }
        }

        if (containerId === 'myclass-calendar-grid-days') {
            const totalCountEl = document.getElementById('myclass-total-classes-count');
            if (totalCountEl) totalCountEl.textContent = `${totalClassDays}일`;
        }

        // Render previous month's trailing days (disabled/other-month style)
        for (let i = firstDayIndex - 1; i >= 0; i--) {
            const cell = document.createElement('div');
            cell.className = 'calendar-cell other-month';
            const dateNum = prevTotalDays - i;
            cell.innerHTML = `<span class="calendar-date-number">${dateNum}</span>`;
            container.appendChild(cell);
        }

        // Today's date components
        const today = new Date();
        const tYear = today.getFullYear();
        const tMonth = today.getMonth();
        const tDate = today.getDate();

        // Render current month's days
        for (let day = 1; day <= totalDays; day++) {
            const cell = document.createElement('div');
            cell.className = 'calendar-cell';
            
            // Check if today
            if (year === tYear && month === tMonth && day === tDate) {
                cell.classList.add('today');
            }

            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            
            // Date label
            cell.innerHTML = `<span class="calendar-date-number">${day}</span>`;

            // Filter attendance/makeup logs for this date
            const dateLogs = attendance.filter(a => a.studentId === studentId && a.date === dateStr);
            
            const eventContainer = document.createElement('div');
            eventContainer.className = 'calendar-cell-events';

            // Add scheduled regular class if any
            const cellDate = new Date(year, month, day);
            const dayOfWeek = cellDate.getDay();
            const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
            const dayKey = dayKeys[dayOfWeek];
            const studentSchedule = student ? getStudentSchedule(student) : { mon: '', tue: '', wed: '', thu: '', fri: '' };
            const scheduleTime = (dayOfWeek >= 1 && dayOfWeek <= 5) ? studentSchedule[dayKey] : '';
            if (scheduleTime) {
                const schedBadge = document.createElement('div');
                schedBadge.className = 'calendar-badge regular-class';
                schedBadge.style.background = '#f8fafc';
                schedBadge.style.color = '#64748b';
                schedBadge.style.border = '1px dashed #cbd5e1';
                schedBadge.style.fontWeight = '600';
                schedBadge.style.fontSize = '0.62rem';
                schedBadge.textContent = `⏰ 수업: ${scheduleTime}`;
                schedBadge.title = `정규 수업시간: ${scheduleTime}`;
                eventContainer.appendChild(schedBadge);
            }

            // Create a virtual logs list to include automatic attendance
            let virtualLogs = [...dateLogs];
            const cellDateTime = new Date(year, month, day).getTime();
            const todayDate = new Date(tYear, tMonth, tDate).getTime();
            const isTodayOrPast = cellDateTime <= todayDate;

            if (isTodayOrPast && scheduleTime) {
                const hasAnyAttendance = dateLogs.some(log => log.type === 'in' || log.type === 'out' || log.type === 'absent' || log.type === 'makeup');
                if (!hasAnyAttendance) {
                    virtualLogs.push({
                        type: 'in',
                        time: '',
                        memo: '자동 출석'
                    });
                }
            }

            virtualLogs.forEach(log => {
                const badge = document.createElement('div');
                let typeClass = 'in';
                let typeText = '출석';
                if (log.type === 'in') { typeClass = 'in'; typeText = '출석'; countPresent++; }
                else if (log.type === 'out') { typeClass = 'in'; typeText = '출석'; countPresent++; }
                else if (log.type === 'absent') { typeClass = 'absent'; typeText = '결석'; countAbsent++; }
                else if (log.type === 'makeup') { typeClass = 'makeup'; typeText = '보강'; countMakeup++; }

                badge.className = `calendar-badge ${typeClass}`;
                
                const timeInfo = '';
                const memoInfo = log.memo ? ` (${log.memo})` : '';
                badge.textContent = `${typeText}${timeInfo}${memoInfo}`;
                badge.title = `${typeText}${timeInfo}${memoInfo}`;
                eventContainer.appendChild(badge);
            });

            // 🌟 Add purple feedback badge if there is feedback on this date
            const dateFeedbacks = feedbacks.filter(f => f.studentId === studentId && f.date === dateStr);
            if (dateFeedbacks.length > 0) {
                const fbBadge = document.createElement('div');
                fbBadge.className = 'calendar-badge feedback-badge';
                fbBadge.style.background = '#f3e8ff'; // Light purple bg
                fbBadge.style.color = '#7e22ce'; // Purple text
                fbBadge.style.border = '1px solid #c084fc'; // Purple border
                fbBadge.style.fontWeight = '700';
                fbBadge.style.fontSize = '0.62rem';
                fbBadge.style.marginTop = '2px';
                fbBadge.textContent = '📝 피드백';
                fbBadge.title = dateFeedbacks.map(f => f.content).join('\n');
                eventContainer.appendChild(fbBadge);
            }

            cell.appendChild(eventContainer);

            // Add click event for admins to set attendance
            if (isAdmin) {
                cell.addEventListener('click', () => {
                    const editPanel = document.getElementById('attendance-edit-panel');
                    const editDateInput = document.getElementById('attendance-edit-date');
                    const editDateLabel = document.getElementById('attendance-edit-date-label');
                    const editTypeSelect = document.getElementById('attendance-edit-type');
                    const editMemoInput = document.getElementById('attendance-edit-memo');

                    if (editPanel && editDateInput && editDateLabel && editTypeSelect && editMemoInput) {
                        editDateInput.value = dateStr;
                        editDateLabel.textContent = dateStr;

                        // Pre-populate with first log of this day if exists
                        if (dateLogs.length > 0) {
                            const firstLog = dateLogs[0];
                            editTypeSelect.value = firstLog.type;
                            editMemoInput.value = firstLog.memo || '';
                        } else {
                            editTypeSelect.value = 'in';
                            editMemoInput.value = '';
                        }

                        editPanel.style.display = 'block';
                    }
                });
            } else {
                // 🌟 Click event for parents to see details (Feedback, Homework, Progress)
                cell.style.cursor = 'pointer';
                cell.addEventListener('click', () => {
                    const detailModal = document.getElementById('myclass-detail-modal');
                    const detailDate = document.getElementById('myclass-detail-modal-date');
                    const detailFeedback = document.getElementById('myclass-detail-feedback');
                    const detailHomework = document.getElementById('myclass-detail-homework');
                    const detailProgress = document.getElementById('myclass-detail-progress');

                    if (detailModal && detailDate && detailFeedback && detailHomework && detailProgress) {
                        detailDate.textContent = `${year}년 ${month + 1}월 ${day}일 학습 일지`;

                        // 1. Feedback
                        if (dateFeedbacks.length > 0) {
                            detailFeedback.textContent = dateFeedbacks.map(f => f.content).join('\n\n');
                        } else {
                            detailFeedback.innerHTML = `<span style="color: var(--text-muted); font-style: italic;">이날 등록된 지도 피드백이 없습니다.</span>`;
                        }

                        // 2. Homework
                        const hws = homework.filter(h => h.studentId === studentId && h.dueDate === dateStr);
                        if (hws.length > 0) {
                            let hwHtml = '<ul style="margin: 0; padding-left: 20px;">';
                            hws.forEach(hw => {
                                const statusText = hw.isCompleted ? '<span style="color: var(--mascot-green-bg); font-weight: 700;">✅ 완료</span>' : '<span style="color: #ef4444; font-weight: 700;">❌ 미완료</span>';
                                hwHtml += `<li style="margin-bottom: 6px;"><strong>${hw.title}</strong>: ${hw.description} (${statusText})</li>`;
                            });
                            hwHtml += '</ul>';
                            detailHomework.innerHTML = hwHtml;
                        } else {
                            detailHomework.innerHTML = `<span style="color: var(--text-muted); font-style: italic;">이날 제출/예정된 과제가 없습니다.</span>`;
                        }

                        // 3. Progress
                        const todayProgress = progressList.find(p => p.studentId === studentId && p.date === dateStr);
                        const allStudentProgress = progressList
                            .filter(p => p.studentId === studentId)
                            .sort((a, b) => new Date(b.date) - new Date(a.date));
                        const latestProgress = allStudentProgress.length > 0 ? allStudentProgress[0] : null;

                        if (todayProgress) {
                            detailProgress.innerHTML = `<strong>[오늘의 진도]</strong>\n${todayProgress.content}`;
                        } else if (latestProgress) {
                            detailProgress.innerHTML = `<span style="color: var(--text-secondary); display: block; margin-bottom: 6px; font-size: 0.78rem;">💡 이 날짜의 진도 기록이 없어 가장 최근 진도를 표시합니다 (작성일: ${latestProgress.date}):</span><strong>${latestProgress.content}</strong>`;
                        } else {
                            detailProgress.innerHTML = `<span style="color: var(--text-muted); font-style: italic;">등록된 진도 기록이 전혀 없습니다.</span>`;
                        }

                        detailModal.classList.add('open');
                        safeCreateIcons();

                        const closeBtn = document.getElementById('btn-myclass-detail-close');
                        if (closeBtn) {
                            closeBtn.onclick = () => {
                                detailModal.classList.remove('open');
                            };
                        }

                        detailModal.onclick = (e) => {
                            if (e.target === detailModal) {
                                detailModal.classList.remove('open');
                            }
                        };
                    }
                });
            }

            container.appendChild(cell);
        }

        // Render next month's leading days to complete the calendar grid row if needed
        const gridTotalCells = firstDayIndex + totalDays;
        const remainingCells = gridTotalCells % 7 === 0 ? 0 : 7 - (gridTotalCells % 7);
        for (let i = 1; i <= remainingCells; i++) {
            const cell = document.createElement('div');
            cell.className = 'calendar-cell other-month';
            cell.innerHTML = `<span class="calendar-date-number">${i}</span>`;
            container.appendChild(cell);
        }

        // Update summary counts at the top of the calendar modal
        if (containerId === 'calendar-grid-days') {
            const presentEl = document.getElementById('cal-total-present');
            const absentEl = document.getElementById('cal-total-absent');
            const makeupEl = document.getElementById('cal-total-makeup');
            if (presentEl) presentEl.textContent = countPresent;
            if (absentEl) absentEl.textContent = countAbsent;
            if (makeupEl) makeupEl.textContent = countMakeup;
        }

        // Reinitialize icons in calendar if needed
        safeCreateIcons();
    };

    // Student CRUD Listeners
    const attachStudentCardListeners = () => {
        const editBtns = document.querySelectorAll('.btn-student-edit');
        const deleteBtns = document.querySelectorAll('.btn-student-delete');
        const attendanceInBtns = document.querySelectorAll('.btn-attendance-in');
        const attendanceOutBtns = document.querySelectorAll('.btn-attendance-out');
        const assignHomeworkBtns = document.querySelectorAll('.btn-assign-homework');
        const teacherChatBtns = document.querySelectorAll('.btn-teacher-chat');

        editBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = parseStudentId(btn.getAttribute('data-id'));
                const student = students.find(s => s.id === id);
                if (student && studentFormModal) {
                    editStudentIdInput.value = student.id;
                    studentNameInput.value = student.name;
                    studentAgeInput.value = student.age;
                    studentSchoolInput.value = student.school;
                    studentPhoneInput.value = student.phone || '';
                    studentParentPhoneInput.value = student.parentPhone;
                    studentSiblingInput.value = student.sibling || '';
                    if (studentClassDurationInput) {
                        studentClassDurationInput.value = student.classDuration || 90;
                    }
                    
                    if (document.getElementById('student-username-input')) {
                        document.getElementById('student-username-input').value = student.username || '';
                    }
                    if (document.getElementById('student-password-input')) {
                        document.getElementById('student-password-input').value = student.password || '';
                    }
                    if (document.getElementById('student-address-input')) {
                        const parts = (student.address || '').split(' | ');
                        document.getElementById('student-address-input').value = parts[0] || '';
                        if (document.getElementById('student-address-detail-input')) {
                            document.getElementById('student-address-detail-input').value = parts[1] || '';
                        }
                    }

                    // Populate and pre-select class
                    populateClassSelect();
                    const classSelect = document.getElementById('student-class-select');
                    const timeInputs = [
                        studentTimeMonStart, studentTimeMonEnd,
                        studentTimeTueStart, studentTimeTueEnd,
                        studentTimeWedStart, studentTimeWedEnd,
                        studentTimeThuStart, studentTimeThuEnd,
                        studentTimeFriStart, studentTimeFriEnd
                    ];
                    if (classSelect) {
                        classSelect.value = student.classId || '';
                        if (student.classId) {
                            timeInputs.forEach(input => { if (input) input.disabled = true; });
                            if (studentClassDurationInput) studentClassDurationInput.disabled = true;
                        } else {
                            timeInputs.forEach(input => { if (input) input.disabled = false; });
                            if (studentClassDurationInput) studentClassDurationInput.disabled = false;
                        }
                    }

                    const monTime = splitTimeRange(student.schedule.mon);
                    studentTimeMonStart.value = monTime.start;
                    studentTimeMonEnd.value = monTime.end;

                    const tueTime = splitTimeRange(student.schedule.tue);
                    studentTimeTueStart.value = tueTime.start;
                    studentTimeTueEnd.value = tueTime.end;

                    const wedTime = splitTimeRange(student.schedule.wed);
                    studentTimeWedStart.value = wedTime.start;
                    studentTimeWedEnd.value = wedTime.end;

                    const thuTime = splitTimeRange(student.schedule.thu);
                    studentTimeThuStart.value = thuTime.start;
                    studentTimeThuEnd.value = thuTime.end;

                    const friTime = splitTimeRange(student.schedule.fri);
                    studentTimeFriStart.value = friTime.start;
                    studentTimeFriEnd.value = friTime.end;
                    studentProgressInput.value = student.progress;
                    studentRemarksInput.value = student.remarks || '';
                    if (studentTerminatedCheckbox) {
                        studentTerminatedCheckbox.checked = !!student.isTerminated;
                    }
                    if (studentTerminationDateInput) {
                        studentTerminationDateInput.value = student.terminationDate || '';
                    }
                    studentFormModalTitle.textContent = '원생 정보 수정';
                    studentFormModal.classList.add('open');
                }
            });
        });

        deleteBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = parseStudentId(btn.getAttribute('data-id'));
                if (confirm('이 원생의 모든 관리 정보를 삭제하시겠습니까?')) {
                    students = students.filter(s => s.id !== id);
                    saveStudents();
                    renderStudents(studentSearchInput ? studentSearchInput.value : '');
                    showToast('원생 정보가 삭제되었습니다.');
                }
            });
        });

        attendanceInBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseStudentId(btn.getAttribute('data-id'));
                const student = students.find(s => s.id === id);
                if (student) {
                    const today = new Date();
                    const yyyy = today.getFullYear();
                    const mm = String(today.getMonth() + 1).padStart(2, '0');
                    const dd = String(today.getDate()).padStart(2, '0');
                    const todayStr = `${yyyy}-${mm}-${dd}`;

                    // Clear existing attendance logs for today of types 'in', 'out', 'absent' to prevent duplicates
                    attendance = attendance.filter(a => !(a.studentId === id && a.date === todayStr && (a.type === 'in' || a.type === 'out' || a.type === 'absent')));

                    attendance.push({
                        id: Date.now(),
                        studentId: id,
                        date: todayStr,
                        type: 'in',
                        time: '',
                        memo: ''
                    });
                    saveAttendance();
                    renderStudents(studentSearchInput ? studentSearchInput.value : '');
                    showToast(`[알림문자 전송] ${student.name} 출석 안심문자 전송 완료 (부모: ${student.parentPhone})`);
                }
            });
        });

        attendanceOutBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseStudentId(btn.getAttribute('data-id'));
                const student = students.find(s => s.id === id);
                if (student) {
                    const today = new Date();
                    const yyyy = today.getFullYear();
                    const mm = String(today.getMonth() + 1).padStart(2, '0');
                    const dd = String(today.getDate()).padStart(2, '0');
                    const todayStr = `${yyyy}-${mm}-${dd}`;

                    // Clear existing attendance logs for today of types 'in', 'out', 'absent' to prevent duplicates
                    attendance = attendance.filter(a => !(a.studentId === id && a.date === todayStr && (a.type === 'in' || a.type === 'out' || a.type === 'absent')));

                    attendance.push({
                        id: Date.now(),
                        studentId: id,
                        date: todayStr,
                        type: 'absent',
                        time: '',
                        memo: ''
                    });
                    saveAttendance();
                    renderStudents(studentSearchInput ? studentSearchInput.value : '');
                    showToast(`[알림문자 전송] ${student.name} 결석 안심문자 전송 완료 (부모: ${student.parentPhone})`);
                }
            });
        });

        assignHomeworkBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseStudentId(btn.getAttribute('data-id'));
                const student = students.find(s => s.id === id);
                const hwModal = document.getElementById('homework-modal');
                const hwStudentIdInput = document.getElementById('homework-student-id');
                const hwModalDesc = document.getElementById('homework-modal-desc');
                const hwDueDateInput = document.getElementById('homework-due-date');

                if (student && hwModal && hwStudentIdInput && hwModalDesc) {
                    hwStudentIdInput.value = id;
                    hwModalDesc.textContent = `[${student.name}] 원생에게 부여할 수학 과제를 입력하세요.`;
                    
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    const yyyy = tomorrow.getFullYear();
                    const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
                    const dd = String(tomorrow.getDate()).padStart(2, '0');
                    if (hwDueDateInput) hwDueDateInput.value = `${yyyy}-${mm}-${dd}`;
                    
                    hwModal.classList.add('open');
                }
            });
        });

        const writeFeedbackBtns = document.querySelectorAll('.btn-write-feedback');
        writeFeedbackBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseStudentId(btn.getAttribute('data-id'));
                const student = students.find(s => s.id === id);
                const fbModal = document.getElementById('feedback-modal');
                const fbStudentIdInput = document.getElementById('feedback-student-id');
                const fbModalDesc = document.getElementById('feedback-modal-desc');
                const fbDateInput = document.getElementById('feedback-date');
                const fbContentInput = document.getElementById('feedback-content');

                if (student && fbModal && fbStudentIdInput && fbModalDesc && fbDateInput) {
                    fbStudentIdInput.value = id;
                    fbModalDesc.textContent = `[${student.name}] 원생에게 남길 학업 피드백 및 특이사항을 작성하세요.`;
                    
                    const today = new Date();
                    const yyyy = today.getFullYear();
                    const mm = String(today.getMonth() + 1).padStart(2, '0');
                    const dd = String(today.getDate()).padStart(2, '0');
                    fbDateInput.value = `${yyyy}-${mm}-${dd}`;
                    if (fbContentInput) fbContentInput.value = '';
                    
                    fbModal.classList.add('open');
                }
            });
        });

        const writeProgressBtns = document.querySelectorAll('.btn-write-progress');
        writeProgressBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseStudentId(btn.getAttribute('data-id'));
                const student = students.find(s => s.id === id);

                if (student && progressFormModal && progressStudentIdInput && progressDateInput) {
                    progressStudentIdInput.value = id;
                    const descEl = document.getElementById('progress-modal-desc');
                    if (descEl) {
                        descEl.textContent = `[${student.name}] 원생의 오늘 학습 진도 기록을 작성하세요.`;
                    }
                    
                    const today = new Date();
                    const yyyy = today.getFullYear();
                    const mm = String(today.getMonth() + 1).padStart(2, '0');
                    const dd = String(today.getDate()).padStart(2, '0');
                    progressDateInput.value = `${yyyy}-${mm}-${dd}`;
                    if (progressContentInput) progressContentInput.value = '';
                    
                    progressFormModal.classList.add('open');
                }
            });
        });

        const studentCalendarBtns = document.querySelectorAll('.btn-student-calendar');
        studentCalendarBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseStudentId(btn.getAttribute('data-id'));
                const student = students.find(s => s.id === id);
                const calModal = document.getElementById('attendance-calendar-modal');
                
                if (student && calModal) {
                    currentCalStudentId = id;
                    const today = new Date();
                    currentCalYear = today.getFullYear();
                    currentCalMonth = today.getMonth(); // 0-indexed
                    
                    document.getElementById('calendar-modal-title').textContent = `${student.name} 출결 및 보강 캘린더`;
                    document.getElementById('calendar-modal-desc').textContent = `${student.name} 학생의 월별 출결 현황을 달력으로 체크하고 보강을 관리합니다.`;
                    
                    // Reset makeup form date
                    const makeupDateInput = document.getElementById('makeup-date');
                    if (makeupDateInput) {
                        const yyyy = today.getFullYear();
                        const mm = String(today.getMonth() + 1).padStart(2, '0');
                        const dd = String(today.getDate()).padStart(2, '0');
                        makeupDateInput.value = `${yyyy}-${mm}-${dd}`;
                    }
                    const makeupTimeInput = document.getElementById('makeup-time');
                    if (makeupTimeInput) makeupTimeInput.value = '';
                    const makeupMemoInput = document.getElementById('makeup-memo');
                    if (makeupMemoInput) makeupMemoInput.value = '';

                    // Hide edit panel initially
                    const editPanel = document.getElementById('attendance-edit-panel');
                    if (editPanel) editPanel.style.display = 'none';

                    renderCalendar(id, currentCalYear, currentCalMonth, 'calendar-grid-days', true);
                    calModal.classList.add('open');
                }
            });
        });

        teacherChatBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const id = parseStudentId(btn.getAttribute('data-id'));
                const student = students.find(s => s.id === id);
                const tChatModal = document.getElementById('teacher-chat-modal');
                const tChatTitle = document.getElementById('teacher-chat-title');
                const tChatStudentIdInput = document.getElementById('teacher-chat-student-id');

                if (student && tChatModal && tChatTitle && tChatStudentIdInput) {
                    tChatStudentIdInput.value = id;
                    tChatTitle.textContent = `1:1 상담 메신저 - ${student.name} 학부모`;
                    renderTeacherChat(id);
                    tChatModal.classList.add('open');
                }
            });
        });
    };

    // Open Add Student Modal
    if (btnStudentWrite && studentFormModal && studentEditorForm) {
        btnStudentWrite.addEventListener('click', () => {
            editStudentIdInput.value = '';
            studentEditorForm.reset();
            if (studentClassDurationInput) {
                studentClassDurationInput.value = 90;
            }
            if (studentTerminatedCheckbox) studentTerminatedCheckbox.checked = false;
            if (studentTerminationDateInput) studentTerminationDateInput.value = '';
            if (document.getElementById('student-username-input')) document.getElementById('student-username-input').value = '';
            if (document.getElementById('student-password-input')) document.getElementById('student-password-input').value = '';
            if (document.getElementById('student-address-input')) document.getElementById('student-address-input').value = '';
            if (document.getElementById('student-address-detail-input')) document.getElementById('student-address-detail-input').value = '';

            // Populate and reset class select
            populateClassSelect();
            const classSelect = document.getElementById('student-class-select');
            if (classSelect) {
                classSelect.value = '';
            }
            const timeInputs = [
                studentTimeMonStart, studentTimeMonEnd,
                studentTimeTueStart, studentTimeTueEnd,
                studentTimeWedStart, studentTimeWedEnd,
                studentTimeThuStart, studentTimeThuEnd,
                studentTimeFriStart, studentTimeFriEnd
            ];
            timeInputs.forEach(input => { if (input) input.disabled = false; });
            if (studentClassDurationInput) studentClassDurationInput.disabled = false;

            studentFormModalTitle.textContent = '새 원생 등록';
            studentFormModal.classList.add('open');
        });

        if (btnStudentFormClose) {
            btnStudentFormClose.addEventListener('click', () => {
                studentFormModal.classList.remove('open');
            });
        }

        studentFormModal.addEventListener('click', (e) => {
            if (e.target === studentFormModal) {
                studentFormModal.classList.remove('open');
            }
        });

        // Add / Edit form submit
        studentEditorForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const editId = editStudentIdInput.value;
            const name = studentNameInput.value.trim();
            const age = parseInt(studentAgeInput.value);
            const school = studentSchoolInput.value.trim();
            const phone = studentPhoneInput.value.trim();
            const parentPhone = studentParentPhoneInput.value.trim();
            const sibling = studentSiblingInput.value.trim();
            const classDuration = studentClassDurationInput ? parseInt(studentClassDurationInput.value, 10) || 90 : 90;
            
            const classSelect = document.getElementById('student-class-select');
            const classId = (classSelect && classSelect.value) ? parseStudentId(classSelect.value) : null;

            const schedule = {
                mon: joinTimeRange(studentTimeMonStart.value, studentTimeMonEnd.value),
                tue: joinTimeRange(studentTimeTueStart.value, studentTimeTueEnd.value),
                wed: joinTimeRange(studentTimeWedStart.value, studentTimeWedEnd.value),
                thu: joinTimeRange(studentTimeThuStart.value, studentTimeThuEnd.value),
                fri: joinTimeRange(studentTimeFriStart.value, studentTimeFriEnd.value)
            };
            const progress = studentProgressInput.value.trim();
            const remarks = studentRemarksInput.value.trim();
            const isTerminated = studentTerminatedCheckbox ? studentTerminatedCheckbox.checked : false;
            const terminationDate = studentTerminationDateInput ? studentTerminationDateInput.value : '';
            const username = document.getElementById('student-username-input') ? document.getElementById('student-username-input').value.trim() : '';
            const password = document.getElementById('student-password-input') ? document.getElementById('student-password-input').value.trim() : '';
            const addressBase = document.getElementById('student-address-input') ? document.getElementById('student-address-input').value.trim() : '';
            const addressDetail = document.getElementById('student-address-detail-input') ? document.getElementById('student-address-detail-input').value.trim() : '';
            const address = addressDetail ? `${addressBase} | ${addressDetail}` : addressBase;

            if (editId) {
                // Update
                const id = parseStudentId(editId);
                students = students.map(student => {
                    if (student.id === id) {
                        const updated = {
                            ...student,
                            name,
                            age,
                            school,
                            phone,
                            parentPhone,
                            sibling,
                            classDuration,
                            classId,
                            schedule,
                            progress,
                            remarks,
                            isTerminated,
                            terminationDate,
                            username,
                            password,
                            address
                        };
                        
                        // Sync back to parent user in gongbubang_mock_users if they are linked
                        let mockUsers = JSON.parse(localStorage.getItem('gongbubang_mock_users') || '[]');
                        let parentId = null;
                        if (String(id).includes('-')) {
                            parentId = String(id).split('-')[0];
                        }
                        if (parentId) {
                            mockUsers = mockUsers.map(u => {
                                if (u.id === parentId) {
                                    const updatedChildren = (u.user_metadata?.children || []).map(child => {
                                        if (child.name === name) {
                                            return { ...child, username, password };
                                        }
                                        return child;
                                    });
                                    return {
                                        ...u,
                                        address,
                                        user_metadata: {
                                            ...u.user_metadata,
                                            address,
                                            children: updatedChildren
                                        }
                                    };
                                }
                                return u;
                            });
                            localStorage.setItem('gongbubang_mock_users', JSON.stringify(mockUsers));
                        }
                        
                        return updated;
                    }
                    return student;
                });
                saveStudents();
                showToast('원생 정보가 성공적으로 수정되었습니다.');
            } else {
                // Create
                const newStudent = {
                    id: Date.now(),
                    name,
                    age,
                    school,
                    phone,
                    parentPhone,
                    sibling,
                    classDuration,
                    classId,
                    schedule,
                    progress,
                    remarks,
                    isTerminated,
                    terminationDate,
                    username,
                    password,
                    address
                };
                students.unshift(newStudent);
                saveStudents();
                showToast('새 원생 카드가 등록되었습니다.');
            }

            studentFormModal.classList.remove('open');
            renderStudents(studentSearchInput ? studentSearchInput.value : '');
        });
    }

    // Realtime search filter
    if (studentSearchInput) {
        studentSearchInput.addEventListener('input', () => {
            renderStudents(studentSearchInput.value);
        });
    }

    // Notice Realtime search & category tag filter
    const noticeSearchInput = document.getElementById('notice-search-input');
    const noticeFilterTabs = document.querySelectorAll('.notice-filter-tab');

    if (noticeSearchInput) {
        noticeSearchInput.addEventListener('input', () => {
            currentNoticeQuery = noticeSearchInput.value;
            renderNotices();
        });
    }

    noticeFilterTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            noticeFilterTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentNoticeTag = tab.getAttribute('data-tag');
            renderNotices();
        });
    });

    // Realtime feedback filter for Admin Student Cards
    if (studentGridContainer) {
        studentGridContainer.addEventListener('input', (e) => {
            if (e.target && e.target.classList.contains('student-feedback-search')) {
                const query = e.target.value.trim().toLowerCase();
                const card = e.target.closest('.student-card');
                if (card) {
                    const feedbackItems = card.querySelectorAll('.feedback-item');
                    feedbackItems.forEach(item => {
                        const span = item.querySelector('span');
                        const div = item.querySelector('div');
                        const dateText = span ? span.textContent.toLowerCase() : '';
                        const contentText = div ? div.textContent.toLowerCase() : '';
                        if (dateText.includes(query) || contentText.includes(query)) {
                            item.style.display = '';
                        } else {
                            item.style.display = 'none';
                        }
                    });
                }
            }
        });
    }

    // Realtime feedback filter for Student/Parent Portal Info Widget
    const infoWidget = document.getElementById('myclass-info-widget');
    if (infoWidget) {
        infoWidget.addEventListener('input', (e) => {
            if (e.target && e.target.id === 'myclass-feedback-search') {
                const query = e.target.value.trim().toLowerCase();
                const feedbackItems = infoWidget.querySelectorAll('.myclass-feedback-item');
                feedbackItems.forEach(item => {
                    const span = item.querySelector('span');
                    const div = item.querySelector('div');
                    const dateText = span ? span.textContent.toLowerCase() : '';
                    const contentText = div ? div.textContent.toLowerCase() : '';
                    if (dateText.includes(query) || contentText.includes(query)) {
                        item.style.display = '';
                    } else {
                        item.style.display = 'none';
                    }
                });
            }
        });
    }

    // ==========================================================================
    // Admin Toggle & Authentication Actions
    // ==========================================================================
    // Admin login form submit (inside main login modal)
    const adminLoginFormElement = document.getElementById('admin-login-form');
    const adminLoginPassword = document.getElementById('admin-login-password');
    const adminLoginAuthErrorMsg = document.getElementById('admin-login-auth-error-msg');

    if (adminLoginFormElement && adminLoginPassword) {
        adminLoginFormElement.addEventListener('submit', (e) => {
            e.preventDefault();
            const password = adminLoginPassword.value.trim();

            if (password === '9999') {
                if (studentLoginModal) {
                    studentLoginModal.classList.remove('open');
                }
                handleAdminLoginSetup();
                showToast('관리자 모드가 성공적으로 활성화되었습니다.');
                
                // Redirection check
                if (sessionStorage.getItem('login_callback_url')) {
                    handleLoginSuccessRedirection();
                }
            } else {
                if (adminLoginAuthErrorMsg) adminLoginAuthErrorMsg.style.display = 'block';
                const authBox = studentLoginModal ? studentLoginModal.querySelector('.modal-box') : null;
                if (authBox) {
                    authBox.classList.add('shake');
                    adminLoginPassword.value = '';
                    adminLoginPassword.focus();

                    setTimeout(() => {
                        authBox.classList.remove('shake');
                    }, 400);
                }
            }
            safeCreateIcons();
        });
    }

    // ==========================================================================
    // Notice Editor Actions (Write / Edit Form Submit)
    // ==========================================================================
    if (btnAdminWrite && noticeFormModal && noticeEditorForm && editNoticeIdInput && noticeTagSelect && noticeTitleInput && noticeContentInput && formModalTitle) {
        btnAdminWrite.addEventListener('click', () => {
            editNoticeIdInput.value = '';
            noticeEditorForm.reset();
            if (noticeSizeSelect) noticeSizeSelect.value = 'normal';
            if (noticeColorSelect) noticeColorSelect.value = 'default';
            if (noticePinCheckbox) noticePinCheckbox.checked = false;
            formModalTitle.textContent = '새 공지사항 등록';
            noticeFormModal.classList.add('open');
        });

        if (btnFormClose) {
            btnFormClose.addEventListener('click', () => {
                noticeFormModal.classList.remove('open');
            });
        }

        noticeFormModal.addEventListener('click', (e) => {
            if (e.target === noticeFormModal) {
                noticeFormModal.classList.remove('open');
            }
        });

        noticeEditorForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const editId = editNoticeIdInput.value;
            const tag = noticeTagSelect.value;
            const titleSize = noticeSizeSelect ? noticeSizeSelect.value : 'normal';
            const titleColor = noticeColorSelect ? noticeColorSelect.value : 'default';
            const pinned = noticePinCheckbox ? noticePinCheckbox.checked : false;
            const title = noticeTitleInput.value.trim();
            const content = noticeContentInput.value.trim();

            if (editId) {
                // Update
                const id = parseInt(editId);
                notices = notices.map(notice => {
                    if (notice.id === id) {
                        return {
                            ...notice,
                            tag,
                            title,
                            content,
                            titleSize,
                            titleColor,
                            pinned,
                            highlight: pinned
                        };
                    }
                    return notice;
                });
                saveNotices();
                showToast('공지사항이 정상적으로 수정되었습니다.');
            } else {
                // Create
                const newNotice = {
                    id: Date.now(),
                    tag,
                    title,
                    content,
                    titleSize,
                    titleColor,
                    pinned,
                    date: getFormattedDate(),
                    author: '이공 원장',
                    highlight: pinned
                };
                notices.unshift(newNotice); // Put to top
                saveNotices();
                showToast('새 공지사항이 성공적으로 등록되었습니다.');
            }

            noticeFormModal.classList.remove('open');
            renderNotices();
        });
    }

    // ==========================================================================
    // Student/Parent Dashboard Portal & Chat Messenger (PRD Simulation)
    // ==========================================================================
    
    // DOM Elements for Student Portal
    const btnStudentLoginToggle = btnLoginToggle;
    // studentLoginModal is already declared above
    const btnStudentLoginClose = document.getElementById('btn-student-login-close');
    const studentLoginForm = document.getElementById('student-login-form');
    const studentLoginNameInput = document.getElementById('student-login-name');
    const studentLoginPhoneInput = document.getElementById('student-login-phone');
    const studentAuthErrorMsg = document.getElementById('student-auth-error-msg');
    
    const myclassSection = document.getElementById('myclass');
    const navLinkMyclass = document.getElementById('nav-link-myclass');
    const drawerLinkMyclass = document.getElementById('drawer-link-myclass');
    
    const homeworkFormModal = document.getElementById('homework-modal');
    const btnHomeworkClose = document.getElementById('btn-homework-close');
    const homeworkForm = document.getElementById('homework-form');
    const homeworkStudentIdInput = document.getElementById('homework-student-id');
    const homeworkDueDateInput = document.getElementById('homework-due-date');
    const homeworkTitleInput = document.getElementById('homework-title');
    const homeworkDescriptionInput = document.getElementById('homework-description');
    
    const feedbackFormModal = document.getElementById('feedback-modal');
    const btnFeedbackClose = document.getElementById('btn-feedback-close');
    const feedbackForm = document.getElementById('feedback-form');
    const feedbackStudentIdInput = document.getElementById('feedback-student-id');
    const feedbackDateInput = document.getElementById('feedback-date');
    const feedbackContentInput = document.getElementById('feedback-content');

    const progressFormModal = document.getElementById('progress-modal');
    const btnProgressClose = document.getElementById('btn-progress-close');
    const progressForm = document.getElementById('progress-form');
    const progressStudentIdInput = document.getElementById('progress-student-id');
    const progressDateInput = document.getElementById('progress-date');
    const progressContentInput = document.getElementById('progress-content');
    
    const chatSendForm = document.getElementById('chat-send-form');
    const chatInputMessage = document.getElementById('chat-input-message');
    
    const teacherChatModal = document.getElementById('teacher-chat-modal');
    const btnTeacherChatClose = document.getElementById('btn-teacher-chat-close');
    const teacherChatSendForm = document.getElementById('teacher-chat-send-form');
    const teacherChatStudentIdInput = document.getElementById('teacher-chat-student-id');
    const teacherChatInput = document.getElementById('teacher-chat-input');

    // Helper: format message time (e.g. 오후 1:40)
    const getFormattedTime = () => {
        const now = new Date();
        const hours = now.getHours();
        const ampm = hours >= 12 ? '오후' : '오전';
        const displayHours = hours % 12 || 12;
        const minutes = String(now.getMinutes()).padStart(2, '0');
        return `${ampm} ${displayHours}:${minutes}`;
    };

    // Render Chat inside Student Portal
    const renderStudentChat = () => {
        const container = document.getElementById('chat-messages-container');
        if (!container || !loggedInStudentId) return;

        container.innerHTML = '';
        const studentMessages = messages.filter(m => m.studentId === loggedInStudentId);

        if (studentMessages.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: var(--text-muted); font-size: 0.85rem;">
                    선생님과의 첫 상담을 시작해 보세요. 메시지를 보내면 즉시 선생님 웹 대시보드에 공유됩니다.
                </div>
            `;
            return;
        }

        studentMessages.forEach(msg => {
            const row = document.createElement('div');
            row.className = 'chat-message-row';
            
            const isMe = msg.sender === 'parent';
            const bubbleClass = isMe ? 'parent-student' : 'teacher';
            
            row.innerHTML = `
                <div class="chat-bubble ${bubbleClass}" style="align-self: ${isMe ? 'flex-end' : 'flex-start'};">
                    ${msg.text}
                </div>
                <div class="chat-message-time" style="align-self: ${isMe ? 'flex-end' : 'flex-start'};">
                    ${msg.time}
                </div>
            `;
            container.appendChild(row);
        });

        container.scrollTop = container.scrollHeight;
    };

    // Render Chat inside Teacher Modal
    const renderTeacherChat = (studentId) => {
        const container = document.getElementById('teacher-chat-messages-container');
        if (!container) return;

        container.innerHTML = '';
        const studentMessages = messages.filter(m => m.studentId === studentId);

        if (studentMessages.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: var(--text-muted); font-size: 0.85rem;">
                    대화 내역이 없습니다.
                </div>
            `;
            return;
        }

        studentMessages.forEach(msg => {
            const row = document.createElement('div');
            row.className = 'chat-message-row';
            
            const isTeacher = msg.sender === 'teacher';
            const bubbleClass = isTeacher ? 'parent-student' : 'teacher'; // In teacher modal, teacher messages are aligned to the right (parent-student style)
            
            row.innerHTML = `
                <div class="chat-bubble ${bubbleClass}" style="align-self: ${isTeacher ? 'flex-end' : 'flex-start'};">
                    ${msg.text}
                </div>
                <div class="chat-message-time" style="align-self: ${isTeacher ? 'flex-end' : 'flex-start'};">
                    ${msg.time}
                </div>
            `;
            container.appendChild(row);
        });

        container.scrollTop = container.scrollHeight;
    };

    // Get array of date strings (YYYY-MM-DD) representing the week containing selectedDate
    const getWeekDates = (dateStr) => {
        const current = new Date(dateStr);
        const day = current.getDay(); // 0 is Sunday, 1 is Monday, etc.
        const diff = current.getDate() - day + (day === 0 ? -6 : 1); // Monday
        const monday = new Date(current.setDate(diff));
        
        const dates = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const dt = String(d.getDate()).padStart(2, '0');
            dates.push(`${y}-${m}-${dt}`);
        }
        return dates;
    };

    // Update Admin Quick Menu Highlights & Badge counts
    let isUpdatingHighlights = false;
    const updateAdminQuickMenuHighlights = () => {
        if (isUpdatingHighlights) return;
        isUpdatingHighlights = true;
        
        try {
            // 1. Uncompleted Consultations
            const pendingConsults = consultations.filter(c => c.status === 'pending').length;
            const btnConsult = document.querySelector('#admin-quick-menu a[href="#consult-management-card"]');
            if (btnConsult) {
                if (pendingConsults > 0) {
                    btnConsult.style.background = 'rgba(249, 115, 22, 0.08)';
                    btnConsult.style.borderColor = 'rgba(249, 115, 22, 0.3)';
                    btnConsult.style.color = 'rgb(234, 88, 12)';
                    btnConsult.innerHTML = `<i data-lucide="phone-call" style="width: 14px; height: 14px; color: rgb(234, 88, 12);"></i> 상담 문의 <span style="background: rgb(234, 88, 12); color: white; font-size: 0.72rem; padding: 1px 6px; border-radius: 50px; margin-left: 4px; font-weight: 700;">${pendingConsults}</span>`;
                } else {
                    btnConsult.style.background = '#f1f5f9';
                    btnConsult.style.borderColor = 'var(--border-color)';
                    btnConsult.style.color = 'var(--text-primary)';
                    btnConsult.innerHTML = `<i data-lucide="phone-call" style="width: 14px; height: 14px; color: var(--primary-color);"></i> 상담 문의`;
                }
            }

            // 2. Pending Signup Approvals
            const mockUsers = JSON.parse(localStorage.getItem('gongbubang_mock_users') || '[]');
            const pendingApprovals = mockUsers.filter(u => u.role === 'parent' && (u.status === 'pending' || !u.status)).length;
            const btnApproval = document.querySelector('#admin-quick-menu a[href="#approval-management-card"]');
            if (btnApproval) {
                if (pendingApprovals > 0) {
                    btnApproval.style.background = 'rgba(239, 68, 68, 0.08)';
                    btnApproval.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                    btnApproval.style.color = 'rgb(220, 38, 38)';
                    btnApproval.innerHTML = `<i data-lucide="shield-check" style="width: 14px; height: 14px; color: rgb(220, 38, 38);"></i> 가입/종결 승인 <span style="background: rgb(220, 38, 38); color: white; font-size: 0.72rem; padding: 1px 6px; border-radius: 50px; margin-left: 4px; font-weight: 700;">${pendingApprovals}</span>`;
                } else {
                    btnApproval.style.background = '#f1f5f9';
                    btnApproval.style.borderColor = 'var(--border-color)';
                    btnApproval.style.color = 'var(--text-primary)';
                    btnApproval.innerHTML = `<i data-lucide="shield-check" style="width: 14px; height: 14px; color: var(--success-color);"></i> 가입/종결 승인`;
                }
            }

            // 3. AI Queries
            const totalAiQueries = aiQueries.length;
            const btnAi = document.querySelector('#admin-quick-menu a[href="#ai-query-management-card"]');
            if (btnAi) {
                if (totalAiQueries > 0) {
                    btnAi.style.background = 'rgba(139, 92, 246, 0.08)';
                    btnAi.style.borderColor = 'rgba(139, 92, 246, 0.3)';
                    btnAi.style.color = 'rgb(109, 40, 217)';
                    btnAi.innerHTML = `<i data-lucide="sparkles" style="width: 14px; height: 14px; color: rgb(109, 40, 217);"></i> AI 질의 내역 <span style="background: rgb(109, 40, 217); color: white; font-size: 0.72rem; padding: 1px 6px; border-radius: 50px; margin-left: 4px; font-weight: 700;">${totalAiQueries}</span>`;
                } else {
                    btnAi.style.background = '#f1f5f9';
                    btnAi.style.borderColor = 'var(--border-color)';
                    btnAi.style.color = 'var(--text-primary)';
                    btnAi.innerHTML = `<i data-lucide="sparkles" style="width: 14px; height: 14px; color: var(--primary-color);"></i> AI 질의 내역`;
                }
            }

            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        } finally {
            isUpdatingHighlights = false;
        }
    };

    // Handle Redirect / Scroll to callbackUrl after successful login (Joonggonara Style)
    const handleLoginSuccessRedirection = () => {
        const callback = sessionStorage.getItem('login_callback_url');
        if (callback) {
            sessionStorage.removeItem('login_callback_url');
            
            // Clean up query parameters in URL
            const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
            window.history.replaceState({ path: cleanUrl }, '', cleanUrl);

            // Redirect / Scroll to target section
            setTimeout(() => {
                let targetId = callback.replace(/^\//, ''); // Strip leading slash
                if (targetId === 'mystore' || targetId === 'myclass') {
                    targetId = 'myclass';
                } else if (targetId === 'students' || targetId === 'admin') {
                    targetId = 'students';
                }

                const targetEl = document.getElementById(targetId);
                if (targetEl) {
                    // Show hidden dynamic sections if necessary
                    if (targetId === 'myclass' && myclassSection) {
                        myclassSection.style.display = 'block';
                        if (navLinkMyclass) navLinkMyclass.style.display = 'inline-block';
                        if (drawerLinkMyclass) drawerLinkMyclass.style.display = 'block';
                    } else if (targetId === 'students' && studentSection) {
                        studentSection.style.display = 'block';
                        if (navLinkStudents) navLinkStudents.style.display = 'inline-block';
                        if (drawerLinkStudents) drawerLinkStudents.style.display = 'block';
                    }

                    const targetOffset = targetEl.offsetTop - 90;
                    window.scrollTo({ top: targetOffset, behavior: 'smooth' });
                    showToast('요청하신 페이지로 연동되었습니다.');
                }
            }, 300);
        }
    };

    // Render Admin Habits Checklist & Achievement rate
    const renderAdminHabits = () => {
        const tbody = document.getElementById('admin-habit-tbody');
        const dateInput = document.getElementById('admin-habit-record-date');
        const percentageText = document.getElementById('admin-habit-achievement-percentage');
        const progressBar = document.getElementById('admin-habit-achievement-bar');
        const newInput = document.getElementById('admin-habit-new-input');
        const freqSelect = document.getElementById('admin-habit-new-freq');
        const btnAdd = document.getElementById('btn-admin-add-habit');
        const monthlyReport = document.getElementById('admin-monthly-habit-report');

        if (!tbody) return;

        // Set default date to today in local timezone if not set
        if (dateInput && !dateInput.value) {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            dateInput.value = `${year}-${month}-${day}`;
        }

        const selectedDate = dateInput ? dateInput.value : new Date().toISOString().split('T')[0];
        const [yearStr, monthStr] = selectedDate.split('-');
        const daysInMonth = new Date(parseInt(yearStr), parseInt(monthStr), 0).getDate();

        // Seed default habits if empty
        let habits = [];
        try {
            const stored = localStorage.getItem('gongbubang_habits_admin');
            habits = stored ? JSON.parse(stored) : null;
        } catch(e) {}

        if (!habits) {
            habits = [
                { id: 'ah1', text: '학원 전체 청소 및 환기하기', frequency: 7 },
                { id: 'ah2', text: '오늘 수업 교재 및 맞춤형 프린트 준비하기', frequency: 7 },
                { id: 'ah3', text: '출결 현황 확인 및 등원/하원 문자 발송하기', frequency: 7 },
                { id: 'ah4', text: '신규 상담 예약 문의 내역 확인 및 연락하기', frequency: 7 },
                { id: 'ah5', text: '블로그 소식지 및 교육 정보 업데이트하기', frequency: 5 }
            ];
            localStorage.setItem('gongbubang_habits_admin', JSON.stringify(habits));
        }

        // Fill missing frequencies (defaults to 7)
        habits = habits.map(h => ({ ...h, frequency: h.frequency || 7 }));

        // Load records
        let records = {};
        try {
            const stored = localStorage.getItem('gongbubang_habit_records_admin');
            records = stored ? JSON.parse(stored) : {};
        } catch(e) {}

        const dayRecords = records[selectedDate] || {};

        tbody.innerHTML = '';

        if (habits.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3" style="padding: 20px; text-align: center; color: var(--text-secondary);">등록된 업무가 없습니다. 아래 입력창에서 추가해 주세요!</td></tr>`;
            if (percentageText) percentageText.textContent = '0% (0/0 완료)';
            if (progressBar) progressBar.style.width = '0%';
        } else {
            const weekDates = getWeekDates(selectedDate);
            let completedCount = 0;
            habits.forEach(h => {
                const tr = document.createElement('tr');
                const checked = dayRecords[h.id] ? 'checked' : '';
                if (dayRecords[h.id]) completedCount++;

                const freqLabel = h.frequency === 7 ? '매일' : `주 ${h.frequency}회`;

                // Calculate weekly completions
                let weekCompleted = 0;
                weekDates.forEach(d => {
                    if (records[d] && records[d][h.id]) {
                        weekCompleted++;
                    }
                });

                tr.innerHTML = `
                    <td style="padding: 10px; text-align: center; vertical-align: middle;">
                        <input type="checkbox" class="admin-habit-check" data-id="&quot;${h.id}&quot;" ${checked} style="width: 18px; height: 18px; cursor: pointer; accent-color: var(--mascot-purple-bg);">
                    </td>
                    <td style="padding: 12px 10px; text-align: left; font-size: 0.92rem; color: var(--text-primary); font-weight: 500; line-height: 1.4;">
                        ${h.text} <span style="font-size: 0.72rem; color: var(--mascot-purple-bg); font-weight: 700; background: rgba(142, 68, 173, 0.08); padding: 1px 5px; border-radius: 4px; margin-left: 6px;">${freqLabel}</span>
                    </td>
                    <td style="padding: 10px; text-align: center; vertical-align: middle; font-size: 0.92rem; font-weight: 700; color: var(--text-primary);">
                        ${weekCompleted}/${h.frequency}
                    </td>
                    <td style="padding: 10px; text-align: center; vertical-align: middle;">
                        <button type="button" class="btn-delete-admin-habit" data-id="${h.id}" style="background: none; border: none; color: #ef4444; cursor: pointer; padding: 4px; display: inline-flex; align-items: center;"><i data-lucide="trash-2" style="width: 16px; height: 16px;"></i></button>
                    </td>
                `;
                tbody.appendChild(tr);
            });

            // Calculate percentage
            const percentage = Math.round((completedCount / habits.length) * 100);
            if (percentageText) percentageText.textContent = `${percentage}% (${completedCount}/${habits.length} 완료)`;
            if (progressBar) progressBar.style.width = `${percentage}%`;
        }

        // Render Monthly Report
        if (monthlyReport) {
            monthlyReport.innerHTML = '';
            if (habits.length === 0) {
                monthlyReport.innerHTML = '<div style="font-size: 0.85rem; color: var(--text-muted); padding: 10px;">등록된 업무 통계가 없습니다.</div>';
            } else {
                habits.forEach(h => {
                    const targetCompletions = Math.max(1, Math.round(h.frequency * (daysInMonth / 7)));
                    
                    // Count completions in this selected month
                    let completed = 0;
                    const prefix = `${yearStr}-dots-`.replace('\dots', monthStr);
                    Object.keys(records).forEach(d => {
                        if (d.startsWith(prefix) && records[d] && records[d][h.id]) {
                            completed++;
                        }
                    });

                    const rate = Math.min(100, Math.round((completed / targetCompletions) * 100));
                    
                    let barColor = 'var(--mascot-pink-bg)';
                    if (rate >= 80) barColor = 'var(--mascot-green-bg)';
                    else if (rate >= 50) barColor = 'var(--mascot-purple-bg)';

                    const itemDiv = document.createElement('div');
                    itemDiv.style.display = 'flex';
                    itemDiv.style.flexDirection = 'column';
                    itemDiv.style.gap = '4px';
                    itemDiv.innerHTML = `
                        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.82rem; color: var(--text-primary); font-weight: 600;">
                            <span>${h.text} <span style="font-size: 0.72rem; color: var(--text-secondary); font-weight: 500;">(주 ${h.frequency}회 목표)</span></span>
                            <span style="font-weight: 700; color: ${rate >= 80 ? 'var(--mascot-green-bg)' : 'var(--text-primary)'};">${rate}% (${completed}/${targetCompletions}회 실천)</span>
                        </div>
                        <div style="background: #f1f5f9; border-radius: 6px; height: 6px; width: 100%; overflow: hidden; border: 1px solid var(--border-color-split);">
                            <div style="background: ${barColor}; height: 100%; width: ${rate}%; transition: width 0.4s ease;"></div>
                        </div>
                    `;
                    monthlyReport.appendChild(itemDiv);
                });
            }
        }

        const updateStatsRealtime = () => {
            if (monthlyReport) {
                monthlyReport.innerHTML = '';
                habits.forEach(h => {
                    const targetCompletions = Math.max(1, Math.round(h.frequency * (daysInMonth / 7)));
                    let completed = 0;
                    const prefix = `${yearStr}-dots-`.replace('\dots', monthStr);
                    Object.keys(records).forEach(d => {
                        if (d.startsWith(prefix) && records[d] && records[d][h.id]) {
                            completed++;
                        }
                    });
                    const rate = Math.min(100, Math.round((completed / targetCompletions) * 100));
                    let barColor = 'var(--mascot-pink-bg)';
                    if (rate >= 80) barColor = 'var(--mascot-green-bg)';
                    else if (rate >= 50) barColor = 'var(--mascot-purple-bg)';

                    const itemDiv = document.createElement('div');
                    itemDiv.style.display = 'flex';
                    itemDiv.style.flexDirection = 'column';
                    itemDiv.style.gap = '4px';
                    itemDiv.innerHTML = `
                        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.82rem; color: var(--text-primary); font-weight: 600;">
                            <span>${h.text} <span style="font-size: 0.72rem; color: var(--text-secondary); font-weight: 500;">(주 ${h.frequency}회 목표)</span></span>
                            <span style="font-weight: 700; color: ${rate >= 80 ? 'var(--mascot-green-bg)' : 'var(--text-primary)'};">${rate}% (${completed}/${targetCompletions}회 실천)</span>
                        </div>
                        <div style="background: #f1f5f9; border-radius: 6px; height: 6px; width: 100%; overflow: hidden; border: 1px solid var(--border-color-split);">
                            <div style="background: ${barColor}; height: 100%; width: ${rate}%; transition: width 0.4s ease;"></div>
                        </div>
                    `;
                    monthlyReport.appendChild(itemDiv);
                });
            }
        };

        // Bind checkbox listeners
        const checks = tbody.querySelectorAll('.admin-habit-check');
        checks.forEach(chk => {
            chk.addEventListener('change', (e) => {
                const id = e.target.getAttribute('data-id').replace(/^"|"$/g, '').replace(/&quot;/g, '');
                const isChecked = e.target.checked;
                
                if (!records[selectedDate]) records[selectedDate] = {};
                records[selectedDate][id] = isChecked;
                
                localStorage.setItem('gongbubang_habit_records_admin', JSON.stringify(records));
                renderAdminHabits();
            });
        });

        // Bind delete listeners
        const deletes = tbody.querySelectorAll('.btn-delete-admin-habit');
        deletes.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = btn.getAttribute('data-id');
                if (confirm('이 항목을 체크리스트에서 삭제하시겠습니까?')) {
                    habits = habits.filter(h => h.id !== id);
                    localStorage.setItem('gongbubang_habits_admin', JSON.stringify(habits));
                    
                    // Clean up records
                    Object.keys(records).forEach(d => {
                        if (records[d] && records[d][id] !== undefined) {
                            delete records[d][id];
                        }
                    });
                    localStorage.setItem('gongbubang_habit_records_admin', JSON.stringify(records));
                    
                    renderAdminHabits();
                }
            });
        });

        // Date listener
        if (dateInput) {
            const newDateInput = dateInput.cloneNode(true);
            dateInput.parentNode.replaceChild(newDateInput, dateInput);
            newDateInput.addEventListener('change', () => {
                renderAdminHabits();
            });
        }

        // Add habit listener
        if (btnAdd && newInput && freqSelect) {
            const newBtnAdd = btnAdd.cloneNode(true);
            btnAdd.parentNode.replaceChild(newBtnAdd, btnAdd);
            
            const handleAdd = () => {
                const text = newInput.value.trim();
                if (!text) {
                    alert('내용을 입력해 주세요.');
                    return;
                }
                const newHabit = {
                    id: 'ah-' + Date.now(),
                    text: text,
                    frequency: parseInt(freqSelect.value)
                };
                habits.push(newHabit);
                localStorage.setItem('gongbubang_habits_admin', JSON.stringify(habits));
                newInput.value = '';
                renderAdminHabits();
            };
            
            newBtnAdd.addEventListener('click', handleAdd);
            
            newInput.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    handleAdd();
                }
            };
        }

        safeCreateIcons();
    };

    // Render Daily Habits Checklist & Achievement rate
    const renderMyClassDailyHabits = (studentId) => {
        const tbody = document.getElementById('daily-habit-tbody');
        const dateInput = document.getElementById('habit-record-date');
        const percentageText = document.getElementById('habit-achievement-percentage');
        const progressBar = document.getElementById('habit-achievement-bar');
        const newInput = document.getElementById('habit-new-input');
        const freqSelect = document.getElementById('habit-new-freq');
        const btnAdd = document.getElementById('btn-add-habit');
        const monthlyReport = document.getElementById('myclass-monthly-habit-report');

        if (!tbody) return;

        // Set default date to today in local timezone (YYYY-MM-DD) if not set
        if (dateInput && !dateInput.value) {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            dateInput.value = `${year}-${month}-${day}`;
        }

        const selectedDate = dateInput ? dateInput.value : new Date().toISOString().split('T')[0];
        const [yearStr, monthStr] = selectedDate.split('-');
        const daysInMonth = new Date(parseInt(yearStr), parseInt(monthStr), 0).getDate();

        // Seed default habits if empty
        let habits = [];
        try {
            const stored = localStorage.getItem('gongbubang_habits_' + studentId);
            habits = stored ? JSON.parse(stored) : null;
        } catch(e) {}

        if (!habits) {
            habits = [
                { id: 'h1', text: '기상 후 물 2잔 마시기', frequency: 7 },
                { id: 'h2', text: '햇빛 10~20분 쬐기', frequency: 7 },
                { id: 'h3', text: '30분 걷기', frequency: 7 },
                { id: 'h4', text: '단백질 2~3번 챙겨 먹기', frequency: 7 },
                { id: 'h5', text: '채소와 과일 먹기', frequency: 7 },
                { id: 'h6', text: '물 1.5~2L 마시기', frequency: 7 },
                { id: 'h7', text: '오후 2시 이후 카페인 줄이기', frequency: 7 }
            ];
            localStorage.setItem('gongbubang_habits_' + studentId, JSON.stringify(habits));
        }

        // Fill missing frequencies (defaults to 7)
        habits = habits.map(h => ({ ...h, frequency: h.frequency || 7 }));

        // Load records
        let records = {};
        try {
            const stored = localStorage.getItem('gongbubang_habit_records_' + studentId);
            records = stored ? JSON.parse(stored) : {};
        } catch(e) {}

        const dayRecords = records[selectedDate] || {};

        tbody.innerHTML = '';

        if (habits.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3" style="padding: 20px; text-align: center; color: var(--text-secondary);">등록된 습관이 없습니다. 아래 입력칸에서 추가해 주세요!</td></tr>`;
            if (percentageText) percentageText.textContent = '0% (0/0 완료)';
            if (progressBar) progressBar.style.width = '0%';
        } else {
            const weekDates = getWeekDates(selectedDate);
            let completedCount = 0;
            habits.forEach(h => {
                const tr = document.createElement('tr');
                const checked = dayRecords[h.id] ? 'checked' : '';
                if (dayRecords[h.id]) completedCount++;

                const freqLabel = h.frequency === 7 ? '매일' : `주 ${h.frequency}회`;

                // Calculate weekly completions
                let weekCompleted = 0;
                weekDates.forEach(d => {
                    if (records[d] && records[d][h.id]) {
                        weekCompleted++;
                    }
                });

                tr.innerHTML = `
                    <td style="padding: 10px; text-align: center; vertical-align: middle;">
                        <input type="checkbox" class="habit-check" data-id="${h.id}" ${checked} style="width: 18px; height: 18px; cursor: pointer; accent-color: var(--mascot-purple-bg);">
                    </td>
                    <td style="padding: 12px 10px; text-align: left; font-size: 0.92rem; color: var(--text-primary); font-weight: 500; line-height: 1.4;">
                        ${h.text} <span style="font-size: 0.72rem; color: var(--mascot-purple-bg); font-weight: 700; background: rgba(142, 68, 173, 0.08); padding: 1px 5px; border-radius: 4px; margin-left: 6px;">${freqLabel}</span>
                    </td>
                    <td style="padding: 10px; text-align: center; vertical-align: middle; font-size: 0.92rem; font-weight: 700; color: var(--text-primary);">
                        ${weekCompleted}/${h.frequency}
                    </td>
                    <td style="padding: 10px; text-align: center; vertical-align: middle;">
                        <button type="button" class="btn-delete-habit" data-id="${h.id}" style="background: none; border: none; color: #ef4444; cursor: pointer; padding: 4px; display: inline-flex; align-items: center;"><i data-lucide="trash-2" style="width: 16px; height: 16px;"></i></button>
                    </td>
                `;
                tbody.appendChild(tr);
            });

            // Calculate percentage
            const percentage = Math.round((completedCount / habits.length) * 100);
            if (percentageText) percentageText.textContent = `${percentage}% (${completedCount}/${habits.length} 완료)`;
            if (progressBar) progressBar.style.width = `${percentage}%`;
        }

        // Render Monthly Report
        if (monthlyReport) {
            monthlyReport.innerHTML = '';
            if (habits.length === 0) {
                monthlyReport.innerHTML = '<div style="font-size: 0.85rem; color: var(--text-muted); padding: 10px;">등록된 생활습관 통계가 없습니다.</div>';
            } else {
                habits.forEach(h => {
                    const targetCompletions = Math.max(1, Math.round(h.frequency * (daysInMonth / 7)));
                    
                    // Count completions in this selected month
                    let completed = 0;
                    const prefix = `${yearStr}-dots-`.replace('\dots', monthStr);
                    Object.keys(records).forEach(d => {
                        if (d.startsWith(prefix) && records[d] && records[d][h.id]) {
                            completed++;
                        }
                    });

                    const rate = Math.min(100, Math.round((completed / targetCompletions) * 100));
                    
                    let barColor = 'var(--mascot-pink-bg)';
                    if (rate >= 80) barColor = 'var(--mascot-green-bg)';
                    else if (rate >= 50) barColor = 'var(--mascot-purple-bg)';

                    const itemDiv = document.createElement('div');
                    itemDiv.style.display = 'flex';
                    itemDiv.style.flexDirection = 'column';
                    itemDiv.style.gap = '4px';
                    itemDiv.innerHTML = `
                        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.82rem; color: var(--text-primary); font-weight: 600;">
                            <span>${h.text} <span style="font-size: 0.72rem; color: var(--text-secondary); font-weight: 500;">(주 ${h.frequency}회 목표)</span></span>
                            <span style="font-weight: 700; color: ${rate >= 80 ? 'var(--mascot-green-bg)' : 'var(--text-primary)'};">${rate}% (${completed}/${targetCompletions}회 실천)</span>
                        </div>
                        <div style="background: #f1f5f9; border-radius: 6px; height: 6px; width: 100%; overflow: hidden; border: 1px solid var(--border-color-split);">
                            <div style="background: ${barColor}; height: 100%; width: ${rate}%; transition: width 0.4s ease;"></div>
                        </div>
                    `;
                    monthlyReport.appendChild(itemDiv);
                });
            }
        }

        const updateStatsRealtime = () => {
            if (monthlyReport) {
                monthlyReport.innerHTML = '';
                habits.forEach(h => {
                    const targetCompletions = Math.max(1, Math.round(h.frequency * (daysInMonth / 7)));
                    let completed = 0;
                    const prefix = `${yearStr}-dots-`.replace('\dots', monthStr);
                    Object.keys(records).forEach(d => {
                        if (d.startsWith(prefix) && records[d] && records[d][h.id]) {
                            completed++;
                        }
                    });
                    const rate = Math.min(100, Math.round((completed / targetCompletions) * 100));
                    let barColor = 'var(--mascot-pink-bg)';
                    if (rate >= 80) barColor = 'var(--mascot-green-bg)';
                    else if (rate >= 50) barColor = 'var(--mascot-purple-bg)';

                    const itemDiv = document.createElement('div');
                    itemDiv.style.display = 'flex';
                    itemDiv.style.flexDirection = 'column';
                    itemDiv.style.gap = '4px';
                    itemDiv.innerHTML = `
                        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.82rem; color: var(--text-primary); font-weight: 600;">
                            <span>${h.text} <span style="font-size: 0.72rem; color: var(--text-secondary); font-weight: 500;">(주 ${h.frequency}회 목표)</span></span>
                            <span style="font-weight: 700; color: ${rate >= 80 ? 'var(--mascot-green-bg)' : 'var(--text-primary)'};">${rate}% (${completed}/${targetCompletions}회 실천)</span>
                        </div>
                        <div style="background: #f1f5f9; border-radius: 6px; height: 6px; width: 100%; overflow: hidden; border: 1px solid var(--border-color-split);">
                            <div style="background: ${barColor}; height: 100%; width: ${rate}%; transition: width 0.4s ease;"></div>
                        </div>
                    `;
                    monthlyReport.appendChild(itemDiv);
                });
            }
        };

        // Bind checkbox listeners
        const checks = tbody.querySelectorAll('.habit-check');
        checks.forEach(chk => {
            chk.addEventListener('change', (e) => {
                const id = e.target.getAttribute('data-id');
                const isChecked = e.target.checked;
                
                if (!records[selectedDate]) records[selectedDate] = {};
                records[selectedDate][id] = isChecked;
                
                localStorage.setItem('gongbubang_habit_records_' + studentId, JSON.stringify(records));
                renderMyClassDailyHabits(studentId);
            });
        });

        // Bind delete listeners
        const deletes = tbody.querySelectorAll('.btn-delete-habit');
        deletes.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = btn.getAttribute('data-id');
                if (confirm('이 습관을 체크리스트에서 삭제하시겠습니까?')) {
                    habits = habits.filter(h => h.id !== id);
                    localStorage.setItem('gongbubang_habits_' + studentId, JSON.stringify(habits));
                    
                    // Clean up records for this habit
                    Object.keys(records).forEach(d => {
                        if (records[d] && records[d][id] !== undefined) {
                            delete records[d][id];
                        }
                    });
                    localStorage.setItem('gongbubang_habit_records_' + studentId, JSON.stringify(records));
                    
                    renderMyClassDailyHabits(studentId);
                }
            });
        });

        // Bind date change listener (re-clone to avoid duplication)
        if (dateInput) {
            const newDateInput = dateInput.cloneNode(true);
            dateInput.parentNode.replaceChild(newDateInput, dateInput);
            newDateInput.addEventListener('change', () => {
                renderMyClassDailyHabits(studentId);
            });
        }

        // Bind add listener (re-clone to avoid duplication)
        if (btnAdd && newInput && freqSelect) {
            const newBtnAdd = btnAdd.cloneNode(true);
            btnAdd.parentNode.replaceChild(newBtnAdd, btnAdd);
            
            const handleAdd = () => {
                const text = newInput.value.trim();
                if (!text) {
                    alert('습관 내용을 입력해 주세요.');
                    return;
                }
                const newHabit = {
                    id: 'h-' + Date.now(),
                    text: text,
                    frequency: parseInt(freqSelect.value)
                };
                habits.push(newHabit);
                localStorage.setItem('gongbubang_habits_' + studentId, JSON.stringify(habits));
                newInput.value = '';
                renderMyClassDailyHabits(studentId);
            };
            
            newBtnAdd.addEventListener('click', handleAdd);
            
            // Allow enter key press
            newInput.onkeydown = (e) => {
                if (e.key === 'Enter') {
                    handleAdd();
                }
            };
        }

        safeCreateIcons();
    };

    // Render My Class Portal
    const renderMyClass = () => {
        const infoWidget = document.getElementById('myclass-info-widget');
        const homeworkList = document.getElementById('myclass-homework-list');
        const childSelectContainer = document.getElementById('myclass-child-selector-container');
        const childSelect = document.getElementById('myclass-child-select');
        
        if (!loggedInStudentId) return;
        const student = students.find(s => s.id === loggedInStudentId);
        if (!student) return;

        // Determine all children for the logged-in parent
        let parentChildren = [];
        const currentUserId = String(loggedInStudentId).split('-')[0];
        const isEmailUser = currentUserId.length > 8 && currentUserId.includes('-') && !Number.isInteger(Number(currentUserId));
        
        if (isEmailUser) {
            parentChildren = students.filter(s => String(s.id).startsWith(currentUserId));
        } else if (student.parentPhone) {
            parentChildren = students.filter(s => s.parentPhone === student.parentPhone);
        }

        // Show/Hide and populate child selector
        if (parentChildren.length > 1 && childSelectContainer && childSelect) {
            childSelect.innerHTML = '';
            parentChildren.forEach(child => {
                const opt = document.createElement('option');
                opt.value = child.id;
                opt.textContent = `${child.name} (${child.school || '학생'})`;
                if (child.id === loggedInStudentId) {
                    opt.selected = true;
                }
                childSelect.appendChild(opt);
            });
            
            // Re-bind change listener (clone to remove old listeners)
            const newSelect = childSelect.cloneNode(true);
            childSelect.parentNode.replaceChild(newSelect, childSelect);
            
            newSelect.addEventListener('change', () => {
                loggedInStudentId = parseStudentId(newSelect.value);
                renderMyClass();
            });

            childSelectContainer.style.display = 'block';
        } else {
            if (childSelectContainer) childSelectContainer.style.display = 'none';
        }

        // Profile widget render
        if (infoWidget) {
            const days = ['mon', 'tue', 'wed', 'thu', 'fri'];
            const dayLabels = { mon: '월', tue: '화', wed: '수', thu: '목', fri: '금' };
            let scheduleHtml = '';
            const studentSchedule = getStudentSchedule(student);
            days.forEach(day => {
                const timeVal = studentSchedule[day] || '';
                const isEmpty = !timeVal;
                scheduleHtml += `
                    <div style="flex-grow: 1; text-align: center; background: #fafafa; border: 1px solid var(--border-color); padding: 8px; border-radius: 8px;">
                        <div style="font-size: 0.72rem; font-weight: 800; color: var(--text-secondary); margin-bottom: 4px;">${dayLabels[day]}</div>
                        <div style="font-size: 0.78rem; font-weight: 700; color: ${isEmpty ? 'var(--text-muted)' : 'var(--primary-color)'};">${isEmpty ? '-' : timeVal}</div>
                    </div>
                `;
            });

            // Calculate feedbacks list (timeline newest first)
            const studentFeedbacks = feedbacks
                .filter(f => f.studentId === student.id)
                .sort((a, b) => new Date(b.date) - new Date(a.date));
            let feedbacksHtml = '';
            studentFeedbacks.forEach(fb => {
                feedbacksHtml += `
                    <div class="myclass-feedback-item" style="margin-top: 6px; border-bottom: 1px dashed var(--border-color); padding-bottom: 6px;">
                        <span style="font-size: 0.72rem; font-weight: 700; color: var(--mascot-purple-bg); background: rgba(142, 68, 173, 0.08); padding: 1px 5px; border-radius: 4px; display: inline-block; margin-bottom: 2px;">${fb.date}</span>
                        <div style="font-size: 0.8rem; color: var(--text-secondary); line-height: 1.4; white-space: pre-wrap;">${fb.content}</div>
                    </div>
                `;
            });
            if (studentFeedbacks.length === 0) {
                feedbacksHtml = '<div style="color: var(--text-muted); font-size: 0.8rem;">피드백 기록이 없습니다.</div>';
            }

            // Calculate progress list (timeline newest first)
            const studentProgressList = progressList
                .filter(p => p.studentId === student.id)
                .sort((a, b) => new Date(b.date) - new Date(a.date));
            let progressListHtml = '';
            studentProgressList.forEach(prog => {
                progressListHtml += `
                    <div style="margin-top: 6px; border-bottom: 1px dashed var(--border-color); padding-bottom: 6px;">
                        <span style="font-size: 0.72rem; font-weight: 700; color: var(--mascot-green-bg); background: rgba(39, 39, 42, 0.08); padding: 1px 5px; border-radius: 4px; display: inline-block; margin-bottom: 2px;">${prog.date}</span>
                        <div style="font-size: 0.8rem; color: var(--text-secondary); line-height: 1.4; white-space: pre-wrap;">${prog.content}</div>
                    </div>
                `;
            });
            if (studentProgressList.length === 0) {
                progressListHtml = '<div style="color: var(--text-muted); font-size: 0.8rem;">진도 기록이 없습니다.</div>';
            }

            infoWidget.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px dashed var(--border-color); padding-bottom: 12px; margin-bottom: 14px;">
                    <div>
                        <h2 style="font-family: var(--ff-logo); font-size: 1.4rem; color: var(--text-primary); display: inline-block; margin-right: 8px; margin-bottom: 0;">${student.name}</h2>
                        <span style="font-size: 0.85rem; color: var(--text-secondary); font-weight: 500;">${student.age}세 &middot; ${student.school}</span>
                    </div>
                    <span class="student-sibling-tag" style="background: var(--primary-light); color: var(--primary-color); border: 1px solid var(--border-color); font-size: 0.7rem; padding: 4px 8px; border-radius: 6px; font-weight: 700;">자녀 연동 완료</span>
                </div>
                <div style="display: flex; flex-direction: column; gap: 8px; font-size: 0.85rem; margin-bottom: 16px; color: var(--text-secondary);">
                    <div><strong style="color: var(--text-primary);">학부모 연락처:</strong> ${student.parentPhone}</div>
                    <div><strong style="color: var(--text-primary);">대표 교재 / 과정:</strong> <span style="font-weight: 700; color: var(--primary-color);">${student.progress}</span></div>
                    
                    <div style="margin-top: 6px; border-top: 1px dashed var(--border-color); padding-top: 10px;">
                        <strong style="color: var(--text-primary); display: block; margin-bottom: 6px;">학습 진도 기록 히스토리:</strong>
                        <div style="max-height: 120px; overflow-y: auto; padding-right: 4px;">
                            ${progressListHtml}
                        </div>
                    </div>
                    
                    ${userRole === 'student' ? '' : `
                    <div style="margin-top: 6px; border-top: 1px dashed var(--border-color); padding-top: 10px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; gap: 8px;">
                            <strong style="color: var(--text-primary); margin: 0;">선생님 지도 피드백 기록:</strong>
                            <div style="position: relative; width: 120px;">
                                <input type="text" id="myclass-feedback-search" placeholder="피드백 검색..." style="width: 100%; padding: 4px 8px 4px 22px; border-radius: 4px; border: 1px solid var(--border-color); outline: none; font-size: 0.72rem; background: #ffffff;">
                                <i data-lucide="search" style="position: absolute; left: 6px; top: 50%; transform: translateY(-50%); width: 10px; height: 10px; color: var(--text-muted);"></i>
                            </div>
                        </div>
                        <div class="myclass-feedback-list" style="max-height: 120px; overflow-y: auto; padding-right: 4px;">
                            ${feedbacksHtml}
                        </div>
                    </div>
                    `}
                </div>
                <div style="border-top: 1px dashed var(--border-color); padding-top: 12px;">
                    <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-primary); margin-bottom: 8px;">예약된 주간 시간표</div>
                    <div style="display: flex; gap: 6px;">
                        ${scheduleHtml}
                    </div>
                </div>
            `;

            // Initialize myclass calendar date if null
            if (myClassCalYear === null || myClassCalMonth === null) {
                const today = new Date();
                myClassCalYear = today.getFullYear();
                myClassCalMonth = today.getMonth(); // 0-indexed
            }

            // Render parent calendar (view only: isAdmin = false)
            renderCalendar(student.id, myClassCalYear, myClassCalMonth, 'myclass-calendar-grid-days', false);
        }


        // Homework list render
        if (homeworkList) {
            homeworkList.innerHTML = '';
            const studentHomework = homework.filter(h => h.studentId === loggedInStudentId);
            if (studentHomework.length === 0) {
                homeworkList.innerHTML = `
                    <div style="text-align: center; padding: 30px; color: var(--text-secondary); font-size: 0.88rem;">
                        등록된 과제가 없습니다.
                    </div>
                `;
            } else {
                studentHomework.forEach(hw => {
                    const item = document.createElement('div');
                    item.className = `homework-item ${hw.isCompleted ? 'completed' : ''}`;
                    item.innerHTML = `
                        <div style="flex-grow: 1;">
                            <div class="homework-item-left">
                                <input type="checkbox" class="homework-checkbox" data-hw-id="${hw.id}" ${hw.isCompleted ? 'checked' : ''}>
                                <span class="homework-text">${hw.title}</span>
                            </div>
                            <div class="homework-desc">${hw.description}</div>
                        </div>
                        <span class="homework-date">기한: ${hw.dueDate}</span>
                    `;
                    homeworkList.appendChild(item);
                });

                // Attach homework checkbox changes
                const checkboxes = homeworkList.querySelectorAll('.homework-checkbox');
                checkboxes.forEach(box => {
                    box.addEventListener('change', () => {
                        const hwId = parseInt(box.getAttribute('data-hw-id'));
                        homework = homework.map(h => {
                            if (h.id === hwId) {
                                return { ...h, isCompleted: box.checked, completedAt: box.checked ? new Date().toISOString() : null };
                            }
                            return h;
                        });
                        saveHomework();
                        renderMyClass();
                        if (isAdmin) renderStudents(studentSearchInput ? studentSearchInput.value : '');
                        showToast(box.checked ? '과제 완료 처리가 완료되었습니다!' : '과제 대기 상태로 변경되었습니다.');
                    });
                });
            }
        }

        renderMyClassAiHistory();
        renderStudentChat();
        renderMyClassDailyHabits(loggedInStudentId);
        safeCreateIcons();
    };

    // Toggle Student/Parent Login Modal
    if (btnStudentLoginToggle && studentLoginModal && studentLoginForm && studentLoginNameInput && studentLoginPhoneInput && studentAuthErrorMsg) {
        btnStudentLoginToggle.addEventListener('click', async () => {
            if (isAdmin || isStudent) {
                // Logout
                try {
                    await supabase.auth.signOut();
                } catch(e) {
                    console.error('Signout error:', e);
                }

                handleLogoutCleanup();
                showToast('로그아웃 되었습니다.');
            } else {
                // Open login modal
                studentLoginNameInput.value = localStorage.getItem('gongbubang_last_student_name') || '';
                studentLoginPhoneInput.value = '';
                studentAuthErrorMsg.style.display = 'none';
                
                const loginEmailInput = document.getElementById('student-login-email');
                const loginPasswordInput = document.getElementById('student-login-password');
                const studentEmailAuthErrorMsg = document.getElementById('student-email-auth-error-msg');
                if (loginEmailInput) loginEmailInput.value = localStorage.getItem('gongbubang_last_student_email') || '';
                if (loginPasswordInput) loginPasswordInput.value = '';
                if (studentEmailAuthErrorMsg) studentEmailAuthErrorMsg.style.display = 'none';

                const adminLoginPassword = document.getElementById('admin-login-password');
                const adminLoginAuthErrorMsg = document.getElementById('admin-login-auth-error-msg');
                if (adminLoginPassword) adminLoginPassword.value = '';
                if (adminLoginAuthErrorMsg) adminLoginAuthErrorMsg.style.display = 'none';

                // Reset tabs to easy login as default
                if (btnTabEasy && btnTabEmail && btnTabAdmin && easyLoginForm && emailLoginForm && adminLoginForm) {
                    btnTabEasy.classList.add('active');
                    btnTabEmail.classList.remove('active');
                    btnTabAdmin.classList.remove('active');
                    easyLoginForm.style.display = 'block';
                    emailLoginForm.style.display = 'none';
                    adminLoginForm.style.display = 'none';
                    if (socialLoginDivider) socialLoginDivider.style.display = 'block';
                    if (socialLoginButtons) socialLoginButtons.style.display = 'grid';
                    if (signupPrompt) signupPrompt.style.display = 'block';
                }

                studentLoginModal.classList.add('open');
                studentLoginNameInput.focus();
            }
            safeCreateIcons();
        });

        if (btnStudentLoginClose) {
            btnStudentLoginClose.addEventListener('click', () => {
                studentLoginModal.classList.remove('open');
            });
        }

        // Backdrop click listener removed so login modal does not close when clicking outside

        // Submit Student Login Form (Student Login via Student ID / Password)
        studentLoginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const inputId = studentLoginNameInput.value.trim();
            const inputPassword = studentLoginPhoneInput.value;

            // Search in mock users children accounts
            const mockUsers = JSON.parse(localStorage.getItem('gongbubang_mock_users') || '[]');
            let foundParent = null;
            let foundChild = null;
            
            mockUsers.forEach(u => {
                const children = u.user_metadata?.children || [];
                children.forEach(c => {
                    if (c.username && c.username.toLowerCase() === inputId.toLowerCase() && c.password === inputPassword) {
                        foundParent = u;
                        foundChild = c;
                    }
                });
            });

            if (foundParent && foundChild) {
                // Check parent account status
                if (foundParent.status === 'pending') {
                    alert('승인 대기중입니다. 원장님의 승인 완료 후 이용 가능합니다.');
                    return;
                }
                if (foundParent.status === 'terminated') {
                    alert('관리자에 의해 종결된 아이디 입니다.');
                    return;
                }
                
                let foundStudent = students.find(s => s.name === foundChild.name && s.parentPhone === foundParent.phone);
                if (!foundStudent) {
                    let age = 10;
                    if (foundChild.birthdate) {
                        const birthYear = new Date(foundChild.birthdate).getFullYear();
                        age = new Date().getFullYear() - birthYear + 1;
                    }
                    foundStudent = {
                        id: foundParent.id + '-' + foundParent.user_metadata?.children?.findIndex(x => x.username === foundChild.username),
                        name: foundChild.name,
                        age,
                        school: '공부방 초등학교',
                        phone: foundChild.phone || '',
                        parentPhone: foundParent.phone,
                        sibling: foundParent.user_metadata?.children?.length > 1 ? `${foundParent.user_metadata.children.length - 1}명의 형제자매` : '없음',
                        schedule: { mon: '', tue: '', wed: '', thu: '', fri: '' },
                        progress: '개념 완성 과정 등록 대기 중',
                        remarks: '자녀 계정으로 가입되었습니다. 스케줄을 설정해 주세요.',
                        username: foundChild.username,
                        password: foundChild.password,
                        address: foundParent.address
                    };
                    students.unshift(foundStudent);
                    saveStudents();
                }

                // Logged in successfully
                localStorage.setItem('gongbubang_last_student_name', inputId);
                localStorage.setItem('gongbubang_student_session', JSON.stringify({
                    username: foundChild.username,
                    name: foundChild.name,
                    role: 'student'
                }));
                
                isStudent = true;
                loggedInStudentId = foundStudent.id;
                userRole = 'student';
                
                // Hide admin/teacher panels to avoid clash
                if (isAdmin) {
                    isAdmin = false;
                    if (btnAdminWrite) btnAdminWrite.style.display = 'none';
                    if (studentSection) studentSection.style.display = 'none';
                    if (navLinkStudents) navLinkStudents.style.display = 'none';
                    if (drawerLinkStudents) drawerLinkStudents.style.display = 'none';
                }

                studentLoginModal.classList.remove('open');
                updateLoginButton();

                if (myclassSection) myclassSection.style.display = 'block';
                if (navLinkMyclass) navLinkMyclass.style.display = 'inline-block';
                if (drawerLinkMyclass) drawerLinkMyclass.style.display = 'block';

                renderMyClass();
                showToast(`[로그인 성공] ${foundStudent.name} 학생 포털에 연결되었습니다.`);

                // Check for callback redirect, otherwise scroll to myclass
                if (sessionStorage.getItem('login_callback_url')) {
                    handleLoginSuccessRedirection();
                } else {
                    setTimeout(() => {
                        const targetOffset = myclassSection.offsetTop - 90;
                        window.scrollTo({ top: targetOffset, behavior: 'smooth' });
                    }, 100);
                }
            } else {
                studentAuthErrorMsg.style.display = 'block';
                const authBox = studentLoginModal.querySelector('.modal-box');
                if (authBox) {
                    authBox.classList.add('shake');
                    setTimeout(() => authBox.classList.remove('shake'), 400);
                }
            }
        });

        // Submit Student Email Login Form (Supabase Auth)
        const studentEmailLoginForm = document.getElementById('student-email-login-form');
        const studentEmailAuthErrorMsg = document.getElementById('student-email-auth-error-msg');

        if (studentEmailLoginForm) {
            studentEmailLoginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('student-login-email').value.trim();
                const password = document.getElementById('student-login-password').value;

                const submitBtn = studentEmailLoginForm.querySelector('.btn-modal-submit');
                const originalText = submitBtn.textContent;
                submitBtn.disabled = true;
                submitBtn.textContent = '로그인 중...';
                if (studentEmailAuthErrorMsg) studentEmailAuthErrorMsg.style.display = 'none';

                try {
                    // Hardcoded check for admin login via email
                    if (email === 'teacher@math.com' && password === '9999') {
                        studentLoginModal.classList.remove('open');
                        handleAdminLoginSetup();
                        showToast('관리자 모드가 활성화되었습니다.');
                        
                        // Redirection check
                        if (sessionStorage.getItem('login_callback_url')) {
                            handleLoginSuccessRedirection();
                        }
                        return;
                    }

                    // Check local mockUsers database first (runs in both mock and real mode)
                    const mockUsers = JSON.parse(localStorage.getItem('gongbubang_mock_users') || '[]');
                    const foundUserLocal = mockUsers.find(u => u.email === email && u.password === password);
                    
                    if (foundUserLocal) {
                        if (foundUserLocal.status === 'pending') {
                            alert('승인 대기중입니다. 원장님의 승인 완료 후 이용 가능합니다.');
                            return;
                        }
                        if (foundUserLocal.status === 'terminated') {
                            alert('관리자에 의해 종결된 아이디 입니다.');
                            return;
                        }
                    }

                    const { data, error } = await supabase.auth.signInWithPassword({
                        email,
                        password
                    });

                    if (error) {
                        throw error;
                    }

                    if (data.user) {
                        const userStatus = foundUserLocal ? foundUserLocal.status : (data.user.user_metadata?.status || 'approved');
                        if (userStatus === 'pending') {
                            alert('승인 대기중입니다. 원장님의 승인 완료 후 이용 가능합니다.');
                            await supabase.auth.signOut();
                            return;
                        }
                        if (userStatus === 'terminated') {
                            alert('관리자에 의해 종결된 아이디 입니다.');
                            await supabase.auth.signOut();
                            return;
                        }

                        localStorage.setItem('gongbubang_last_student_email', email);
                        localStorage.removeItem('gongbubang_student_session'); // clear student session
                        
                        const name = data.user.user_metadata?.name || '신규학생';
                        const phone = data.user.user_metadata?.phone || '';

                        // Check if student record exists, otherwise create
                        let studentRecord = students.find(s => s.id === data.user.id || (s.name === name && (s.parentPhone === phone || s.phone === phone)));
                        if (!studentRecord) {
                            studentRecord = {
                                id: data.user.id,
                                name,
                                age: 10,
                                school: '공부방 초등학교',
                                phone: '',
                                parentPhone: phone,
                                sibling: '없음',
                                schedule: { mon: '', tue: '', wed: '', thu: '', fri: '' },
                                progress: '개념 완성 과정 등록 대기 중',
                                remarks: 'Supabase로 가입된 계정입니다. 스케줄을 추가해 주세요.',
                                address: data.user.user_metadata?.address || ''
                            };
                            students.unshift(studentRecord);
                            saveStudents();
                        } else if (studentRecord.id !== data.user.id) {
                            // Sync ID
                            students = students.map(s => s.id === studentRecord.id ? { ...s, id: data.user.id, address: data.user.user_metadata?.address || s.address } : s);
                            saveStudents();
                        }

                        // Success login state
                        isStudent = true;
                        loggedInStudentId = data.user.id;
                        userRole = 'parent';

                        // Hide admin/teacher panels to avoid clash
                        if (isAdmin) {
                            isAdmin = false;
                            if (btnAdminWrite) btnAdminWrite.style.display = 'none';
                            if (studentSection) studentSection.style.display = 'none';
                            if (navLinkStudents) navLinkStudents.style.display = 'none';
                            if (drawerLinkStudents) drawerLinkStudents.style.display = 'none';
                        }

                        studentLoginModal.classList.remove('open');
                        updateLoginButton();

                        if (myclassSection) myclassSection.style.display = 'block';
                        if (navLinkMyclass) navLinkMyclass.style.display = 'inline-block';
                        if (drawerLinkMyclass) drawerLinkMyclass.style.display = 'block';

                        renderMyClass();
                        showToast(`[로그인 성공] ${name} 학부모 포털에 연결되었습니다.`);

                        // Smooth scroll to myclass
                        setTimeout(() => {
                            const targetOffset = myclassSection.offsetTop - 90;
                            window.scrollTo({ top: targetOffset, behavior: 'smooth' });
                        }, 200);
                    }
                } catch (err) {
                    console.error('Login error:', err);
                    if (studentEmailAuthErrorMsg) {
                        studentEmailAuthErrorMsg.textContent = err.message || '이메일 또는 비밀번호가 잘못되었습니다.';
                        studentEmailAuthErrorMsg.style.display = 'block';
                        const authBox = studentLoginModal.querySelector('.modal-box');
                        if (authBox) {
                            authBox.classList.add('shake');
                            setTimeout(() => authBox.classList.remove('shake'), 400);
                        }
                    }
                } finally {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                }
            });
        }

        // Submit Signup Form (Social OAuth Complete)
        const studentSignupForm = document.getElementById('student-signup-form');
        const signupErrorMsg = document.getElementById('signup-error-msg');

        if (studentSignupForm) {
            studentSignupForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                // Get email and user ID from the active Supabase session (since they completed Step 1: Social auth!)
                const sessionResp = await supabase.auth.getSession();
                const session = sessionResp.data.session;
                if (!session || !session.user) {
                    alert('인증 정보가 만료되었습니다. 다시 가입을 시도해 주세요.');
                    location.reload();
                    return;
                }

                const email = session.user.email;
                const parentName = document.getElementById('student-signup-name').value.trim();
                const phone = document.getElementById('student-signup-phone').value.trim();
                const addressBase = document.getElementById('student-signup-address').value.trim();
                const addressDetail = document.getElementById('student-signup-address-detail').value.trim();

                // Validate house address
                if (!addressBase) {
                    if (signupErrorMsg) {
                        signupErrorMsg.textContent = '집 주소를 입력해 주세요.';
                        signupErrorMsg.style.display = 'block';
                    }
                    return;
                }
                const address = addressDetail ? `${addressBase} | ${addressDetail}` : addressBase;

                // Check email duplication locally
                const mockUsers = JSON.parse(localStorage.getItem('gongbubang_mock_users') || '[]');
                if (mockUsers.some(u => u.email.toLowerCase() === email.toLowerCase())) {
                    if (signupErrorMsg) {
                        signupErrorMsg.textContent = '이미 가입 완료되었거나 가입 승인 요청 대기 중인 이메일입니다.';
                        signupErrorMsg.style.display = 'block';
                    }
                    return;
                }

                // Collect children info dynamically
                const children = [];
                const childBlocks = signupChildrenContainer.querySelectorAll('.signup-child-block');
                let childValidationError = '';
                
                childBlocks.forEach(block => {
                    const name = block.querySelector('.child-name-input').value.trim();
                    const birthdate = block.querySelector('.child-birth-input').value;
                    const childPhone = block.querySelector('.child-phone-input').value.trim();
                    const childUsername = block.querySelector('.child-id-input').value.trim();
                    const childPassword = block.querySelector('.child-pw-input').value;
                    
                    if (!name || !birthdate || !childUsername || !childPassword) {
                        childValidationError = '자녀 정보(이름, 생년월일, 아이디, 비밀번호)를 모두 입력해 주세요.';
                    }
                    
                    children.push({ name, birthdate, phone: childPhone, username: childUsername, password: childPassword });
                });

                if (childValidationError) {
                    if (signupErrorMsg) {
                        signupErrorMsg.textContent = childValidationError;
                        signupErrorMsg.style.display = 'block';
                    }
                    return;
                }

                if (children.length === 0) {
                    if (signupErrorMsg) {
                        signupErrorMsg.textContent = '최소 한 명 이상의 자녀를 등록해 주세요.';
                        signupErrorMsg.style.display = 'block';
                    }
                    return;
                }

                // Check child username duplication
                let childUsernameDuplicate = false;
                children.forEach(c => {
                    const takenInStudents = students.some(s => s.username && s.username.toLowerCase() === c.username.toLowerCase());
                    let takenInMock = false;
                    mockUsers.forEach(u => {
                        if (u.role === 'student' && u.email === c.username) {
                            takenInMock = true;
                        }
                        const uChildren = u.user_metadata?.children || [];
                        if (uChildren.some(uc => uc.username && uc.username.toLowerCase() === c.username.toLowerCase())) {
                            takenInMock = true;
                        }
                    });
                    if (takenInStudents || takenInMock) {
                        childUsernameDuplicate = true;
                    }
                });

                if (childUsernameDuplicate) {
                    if (signupErrorMsg) {
                        signupErrorMsg.textContent = '등록하려는 자녀의 학생 아이디 중 이미 사용 중인 아이디가 있습니다. 중복 체크를 완료해 주세요.';
                        signupErrorMsg.style.display = 'block';
                    }
                    return;
                }

                const submitBtn = studentSignupForm.querySelector('.btn-modal-submit');
                const originalText = submitBtn.textContent;
                submitBtn.disabled = true;
                submitBtn.textContent = '가입 완료 처리 중...';
                if (signupErrorMsg) signupErrorMsg.style.display = 'none';

                try {
                    // Create locally in mock database with status 'pending'
                    const localPendingUser = {
                        id: session.user.id,
                        email,
                        name: parentName,
                        phone,
                        address,
                        role: 'parent',
                        status: 'pending',
                        createdAt: new Date().toISOString(),
                        user_metadata: {
                            name: parentName,
                            phone,
                            address,
                            children,
                            role: 'parent'
                        }
                    };
                    mockUsers.push(localPendingUser);
                    localStorage.setItem('gongbubang_mock_users', JSON.stringify(mockUsers));

                    // Alert user and close modal
                    alert('회원가입 승인 요청이 완료되었습니다.\n원장님의 승인 완료 후 서비스 이용이 가능합니다.');
                    studentSignupModal.classList.remove('open');
                    studentSignupForm.reset();
                    
                    // Clear signup flow flag
                    sessionStorage.removeItem('gongbubang_signup_flow');

                    // Force signout to clear auto-login session
                    if (supabase.auth.signOut) {
                        await supabase.auth.signOut();
                    }
                } catch (err) {
                    console.error('Signup error:', err);
                    if (signupErrorMsg) {
                        signupErrorMsg.textContent = err.message || '회원가입 중 오류가 발생했습니다.';
                        signupErrorMsg.style.display = 'block';
                        const authBox = studentSignupModal.querySelector('.modal-box');
                        if (authBox) {
                            authBox.classList.add('shake');
                            setTimeout(() => authBox.classList.remove('shake'), 400);
                        }
                    }
                } finally {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                }
            });
        }
    }

    // Homework Assignment Modal Submissions
    if (homeworkForm && homeworkFormModal && homeworkStudentIdInput && homeworkDueDateInput && homeworkTitleInput && homeworkDescriptionInput) {
        if (btnHomeworkClose) {
            btnHomeworkClose.addEventListener('click', () => homeworkFormModal.classList.remove('open'));
        }
        
        homeworkFormModal.addEventListener('click', (e) => {
            if (e.target === homeworkFormModal) homeworkFormModal.classList.remove('open');
        });

        homeworkForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const studentId = parseStudentId(homeworkStudentIdInput.value);
            const dueDate = homeworkDueDateInput.value;
            const title = homeworkTitleInput.value.trim();
            const description = homeworkDescriptionInput.value.trim();

            const newHw = {
                id: Date.now(),
                studentId,
                dueDate,
                title,
                description,
                isCompleted: false
            };

            homework.unshift(newHw);
            saveHomework();
            renderStudents(studentSearchInput ? studentSearchInput.value : '');
            
            // If logged in as student, re-render myclass as well
            if (isStudent && loggedInStudentId === studentId) {
                renderMyClass();
            }

            homeworkFormModal.classList.remove('open');
            const targetStudent = students.find(s => s.id === studentId);
            showToast(`[과제 출제완료] ${targetStudent ? targetStudent.name : '원생'}에게 새 숙제가 배정되었습니다.`);
        });
    }

    // Feedback Assignment Modal Submissions
    if (feedbackForm && feedbackFormModal && feedbackStudentIdInput && feedbackDateInput && feedbackContentInput) {
        if (btnFeedbackClose) {
            btnFeedbackClose.addEventListener('click', () => feedbackFormModal.classList.remove('open'));
        }

        feedbackFormModal.addEventListener('click', (e) => {
            if (e.target === feedbackFormModal) feedbackFormModal.classList.remove('open');
        });

        feedbackForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const studentId = parseStudentId(feedbackStudentIdInput.value);
            const date = feedbackDateInput.value;
            const content = feedbackContentInput.value.trim();

            const newFb = {
                id: Date.now(),
                studentId,
                date,
                content
            };

            feedbacks.unshift(newFb);
            saveFeedbacks();
            renderStudents(studentSearchInput ? studentSearchInput.value : '');

            // If logged in as student, re-render myclass as well to show feedback immediately
            if (isStudent && loggedInStudentId === studentId) {
                renderMyClass();
            }

            feedbackFormModal.classList.remove('open');
            const targetStudent = students.find(s => s.id === studentId);
            showToast(`[피드백 등록완료] ${targetStudent ? targetStudent.name : '원생'}에게 새 피드백이 등록되었습니다.`);
        });
    }

    // Progress Modal Submissions
    if (progressForm && progressFormModal && progressStudentIdInput && progressDateInput && progressContentInput) {
        if (btnProgressClose) {
            btnProgressClose.addEventListener('click', () => progressFormModal.classList.remove('open'));
        }

        progressFormModal.addEventListener('click', (e) => {
            if (e.target === progressFormModal) progressFormModal.classList.remove('open');
        });

        progressForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const studentId = parseStudentId(progressStudentIdInput.value);
            const date = progressDateInput.value;
            const content = progressContentInput.value.trim();

            const newProg = {
                id: Date.now(),
                studentId,
                date,
                content
            };

            progressList.unshift(newProg);
            saveProgressList();
            renderStudents(studentSearchInput ? studentSearchInput.value : '');

            // If logged in as student, re-render myclass as well to show progress immediately
            if (isStudent && loggedInStudentId === studentId) {
                renderMyClass();
            }

            progressFormModal.classList.remove('open');
            const targetStudent = students.find(s => s.id === studentId);
            showToast(`[진도 기록 완료] ${targetStudent ? targetStudent.name : '원생'}의 학습 진도가 기록되었습니다.`);
        });
    }

    // Calendar Modal Submissions & Navigation
    const calModal = document.getElementById('attendance-calendar-modal');
    const btnCalendarClose = document.getElementById('btn-calendar-close');
    const btnCalendarPrev = document.getElementById('btn-calendar-prev');
    const btnCalendarNext = document.getElementById('btn-calendar-next');
    
    const makeupForm = document.getElementById('makeup-form');
    const makeupDateInput = document.getElementById('makeup-date');
    const makeupMemoInput = document.getElementById('makeup-memo');

    const attendanceEditForm = document.getElementById('attendance-edit-form');
    const attendanceEditDate = document.getElementById('attendance-edit-date');
    const attendanceEditType = document.getElementById('attendance-edit-type');
    const attendanceEditMemo = document.getElementById('attendance-edit-memo');
    const btnAttendanceDelete = document.getElementById('btn-attendance-delete');

    if (calModal) {
        if (btnCalendarClose) {
            btnCalendarClose.addEventListener('click', () => calModal.classList.remove('open'));
        }
        calModal.addEventListener('click', (e) => {
            if (e.target === calModal) calModal.classList.remove('open');
        });

        if (btnCalendarPrev) {
            btnCalendarPrev.addEventListener('click', () => {
                if (currentCalMonth === 0) {
                    currentCalMonth = 11;
                    currentCalYear--;
                } else {
                    currentCalMonth--;
                }
                renderCalendar(currentCalStudentId, currentCalYear, currentCalMonth, 'calendar-grid-days', true);
            });
        }

        if (btnCalendarNext) {
            btnCalendarNext.addEventListener('click', () => {
                if (currentCalMonth === 11) {
                    currentCalMonth = 0;
                    currentCalYear++;
                } else {
                    currentCalMonth++;
                }
                renderCalendar(currentCalStudentId, currentCalYear, currentCalMonth, 'calendar-grid-days', true);
            });
        }
    }

    // Makeup Class Form Submit
    if (makeupForm && makeupDateInput && makeupMemoInput) {
        makeupForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (!currentCalStudentId) return;

            const date = makeupDateInput.value;
            const memo = makeupMemoInput.value.trim();

            // Determine day of the week safely (local timezone)
            const parts = date.split('-');
            const dateObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
            const dayOfWeek = dateObj.getDay(); // 0: Sun, 1: Mon, ...
            const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
            const dayKey = dayKeys[dayOfWeek];

            // Get target student
            const targetStudent = students.find(s => s.id === currentCalStudentId);

            // Get target student's starting class schedule time for this day of week
            const getStartTime = (scheduleStr) => {
                if (!scheduleStr) return '';
                const parts = scheduleStr.split('~');
                return parts[0].trim();
            };

            const targetScheduleObj = getStudentSchedule(targetStudent);
            const targetSchedule = targetScheduleObj[dayKey] || '';
            const targetStartTime = getStartTime(targetSchedule);

            const studentIdsToRegister = [currentCalStudentId];
            if (targetStartTime) {
                students.forEach(s => {
                    if (s.id !== currentCalStudentId) {
                        const sScheduleObj = getStudentSchedule(s);
                        if (sScheduleObj[dayKey]) {
                            const sStartTime = getStartTime(sScheduleObj[dayKey]);
                            if (sStartTime === targetStartTime) {
                                studentIdsToRegister.push(s.id);
                            }
                        }
                    }
                });
            }

            // Register makeup for all matching student IDs (avoiding duplicates)
            studentIdsToRegister.forEach((sid, idx) => {
                const exists = attendance.some(a => a.studentId === sid && a.date === date && a.type === 'makeup');
                if (!exists) {
                    attendance.push({
                        id: Date.now() + idx,
                        studentId: sid,
                        date,
                        type: 'makeup',
                        time: '',
                        memo
                    });
                }
            });

            saveAttendance();
            
            // Re-render
            renderCalendar(currentCalStudentId, currentCalYear, currentCalMonth, 'calendar-grid-days', true);
            renderStudents(studentSearchInput ? studentSearchInput.value : '');
            if (isStudent && loggedInStudentId === currentCalStudentId) {
                renderMyClass();
            }

            // Reset inputs (memo)
            makeupMemoInput.value = '';

            const registeredNames = studentIdsToRegister.map(sid => {
                const s = students.find(std => std.id === sid);
                return s ? s.name : '';
            }).filter(Boolean);

            showToast(`[보강 예약 완료] ${registeredNames.join(', ')} 학생에게 보강 일정이 등록되었습니다.`);
        });
    }

    // Daily Attendance Edit Form Submit
    if (attendanceEditForm && attendanceEditDate && attendanceEditType) {
        attendanceEditForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (!currentCalStudentId) return;

            const date = attendanceEditDate.value;
            const type = attendanceEditType.value;
            const memo = attendanceEditMemo.value.trim();

            if (type === 'absent') {
                attendance = attendance.filter(a => !(a.studentId === currentCalStudentId && a.date === date));
            } else if (type === 'in' || type === 'out') {
                attendance = attendance.filter(a => !(a.studentId === currentCalStudentId && a.date === date && a.type === type));
                attendance = attendance.filter(a => !(a.studentId === currentCalStudentId && a.date === date && a.type === 'absent'));
            } else if (type === 'makeup') {
                attendance = attendance.filter(a => !(a.studentId === currentCalStudentId && a.date === date && a.type === 'makeup'));
            }

            const newRecord = {
                id: Date.now(),
                studentId: currentCalStudentId,
                date,
                type,
                time: '',
                memo
            };

            attendance.push(newRecord);
            saveAttendance();

            // Re-render
            renderCalendar(currentCalStudentId, currentCalYear, currentCalMonth, 'calendar-grid-days', true);
            renderStudents(studentSearchInput ? studentSearchInput.value : '');
            if (isStudent && loggedInStudentId === currentCalStudentId) {
                renderMyClass();
            }

            // Hide panel
            document.getElementById('attendance-edit-panel').style.display = 'none';

            showToast('[출결 설정 완료] 선택한 일자의 출결 정보가 저장되었습니다.');
        });

        if (btnAttendanceDelete) {
            btnAttendanceDelete.addEventListener('click', () => {
                if (!currentCalStudentId) return;
                const date = attendanceEditDate.value;
                if (confirm(`${date} 일자의 모든 출결 및 보강 기록을 삭제하시겠습니까?`)) {
                    attendance = attendance.filter(a => !(a.studentId === currentCalStudentId && a.date === date));
                    saveAttendance();

                    // Re-render
                    renderCalendar(currentCalStudentId, currentCalYear, currentCalMonth, 'calendar-grid-days', true);
                    renderStudents(studentSearchInput ? studentSearchInput.value : '');
                    if (isStudent && loggedInStudentId === currentCalStudentId) {
                        renderMyClass();
                    }

                    // Hide panel
                    document.getElementById('attendance-edit-panel').style.display = 'none';
                    showToast('[삭제 완료] 선택한 일자의 출결/보강 기록이 삭제되었습니다.');
                }
            });
        }
    }


    // Student Chat Send Form
    if (chatSendForm && chatInputMessage) {
        chatSendForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const text = chatInputMessage.value.trim();
            if (!text || !loggedInStudentId) return;

            const newMsg = {
                id: Date.now(),
                studentId: loggedInStudentId,
                sender: 'parent',
                text,
                time: getFormattedTime()
            };

            messages.push(newMsg);
            saveMessages();
            chatInputMessage.value = '';
            renderStudentChat();
            
            // If teacher modal is currently open for this student, update it
            const tChatStudentIdInput = document.getElementById('teacher-chat-student-id');
            const tChatModal = document.getElementById('teacher-chat-modal');
            if (tChatModal && tChatModal.classList.contains('open') && tChatStudentIdInput && parseStudentId(tChatStudentIdInput.value) === loggedInStudentId) {
                renderTeacherChat(loggedInStudentId);
            }
        });
    }

    // Teacher Chat Modal Submissions
    if (teacherChatSendForm && teacherChatModal && teacherChatStudentIdInput && teacherChatInput) {
        if (btnTeacherChatClose) {
            btnTeacherChatClose.addEventListener('click', () => teacherChatModal.classList.remove('open'));
        }

        teacherChatModal.addEventListener('click', (e) => {
            if (e.target === teacherChatModal) teacherChatModal.classList.remove('open');
        });

        teacherChatSendForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const studentId = parseStudentId(teacherChatStudentIdInput.value);
            const text = teacherChatInput.value.trim();
            if (!text || !studentId) return;

            const newMsg = {
                id: Date.now(),
                studentId,
                sender: 'teacher',
                text,
                time: getFormattedTime()
            };

            messages.push(newMsg);
            saveMessages();
            teacherChatInput.value = '';
            renderTeacherChat(studentId);

            // If student portal is open, update student portal chat
            if (isStudent && loggedInStudentId === studentId) {
                renderStudentChat();
            }
        });
    }

    // Admin layout setup and cleanup helpers
    const handleLogoutCleanup = () => {
        isAdmin = false;
        isStudent = false;
        loggedInStudentId = null;
        
        // Restore schedule section back to main feed
        const scheduleSection = document.getElementById('schedule');
        const curriculumSection = document.getElementById('curriculum');
        if (scheduleSection && curriculumSection) {
            curriculumSection.parentNode.insertBefore(scheduleSection, curriculumSection.nextSibling);
            scheduleSection.style.display = 'block';
        }
        if (curriculumSection) {
            curriculumSection.style.display = 'block';
        }

        // Show resources section
        const resourcesSection = document.getElementById('resources');
        if (resourcesSection) {
            resourcesSection.style.display = 'block';
        }

        // Hide admin/student specific elements
        if (btnAdminWrite) btnAdminWrite.style.display = 'none';
        if (studentSection) studentSection.style.display = 'none';
        if (navLinkStudents) navLinkStudents.style.display = 'none';
        if (drawerLinkStudents) drawerLinkStudents.style.display = 'none';
        if (myclassSection) myclassSection.style.display = 'none';
        if (navLinkMyclass) navLinkMyclass.style.display = 'none';
        if (drawerLinkMyclass) drawerLinkMyclass.style.display = 'none';
        
        updateLoginButton();
        safeCreateIcons();
        renderNotices();
    };

    const handleAdminLoginSetup = () => {
        isAdmin = true;
        isStudent = false;
        loggedInStudentId = null;

        // Move schedule section inside students section at the bottom (fifth position)
        const scheduleSection = document.getElementById('schedule');
        const studentsSection = document.getElementById('students');
        if (scheduleSection && studentsSection) {
            studentsSection.appendChild(scheduleSection);
            scheduleSection.style.display = 'block';
        }

        // Hide resources section (자료공유 센터)
        const resourcesSection = document.getElementById('resources');
        if (resourcesSection) {
            resourcesSection.style.display = 'none';
        }

        // Hide curriculum section (커리큘럼 소개)
        const curriculumSection = document.getElementById('curriculum');
        if (curriculumSection) {
            curriculumSection.style.display = 'none';
        }
        
        // Hide resource-management-card inside students
        const resourceManagementCard = document.getElementById('resource-management-card');
        if (resourceManagementCard) {
            resourceManagementCard.style.display = 'none';
        }

        // Render admin daily checklist
        renderAdminHabits();

        // Update Quick Menu Highlights
        updateAdminQuickMenuHighlights();

        // Show admin controls
        updateLoginButton();
        if (btnAdminWrite) btnAdminWrite.style.display = 'inline-flex';
        if (studentSection) studentSection.style.display = 'block';
        if (navLinkStudents) navLinkStudents.style.display = 'inline-block';
        if (drawerLinkStudents) drawerLinkStudents.style.display = 'block';

        if (myclassSection) myclassSection.style.display = 'none';
        if (navLinkMyclass) navLinkMyclass.style.display = 'none';
        if (drawerLinkMyclass) drawerLinkMyclass.style.display = 'none';

        renderNotices();
        renderStudents();
        renderConsultList();
        renderAdminCurriculumList();
        renderAiQueryManagement();
        if (typeof renderApprovalList === 'function') renderApprovalList();
        safeCreateIcons();
    };

    // Initial load & Auth Listener Setup
    supabase.auth.onAuthStateChange((event, session) => {
        console.log('[Auth Debug] Event:', event, 'Session:', session ? 'Present' : 'Null');
        if (session && session.user) {
            const emailLower = String(session.user.email || '').toLowerCase();
            console.log('[Auth Debug] User Email:', emailLower);
            
            // Check if they are admin
            if (['rlfn100@naver.com', 'raenisise@naver.com', 'kyungdea1@gmail.com'].includes(emailLower)) {
                console.log('[Auth Debug] Match admin: True');
                handleAdminLoginSetup();
            } else {
                console.log('[Auth Debug] Match admin: False');
                // Ensure admin layout is cleaned up when student/parent logs in
                handleLogoutCleanup();
                // Check if this is a registered user
                const userEmail = session.user.email;
                const mockUsers = JSON.parse(localStorage.getItem('gongbubang_mock_users') || '[]');
                
                // Normalizer helper for phone numbers
                const normalizePhone = (p) => {
                    let cleaned = String(p || '').replace(/\D/g, '');
                    if (cleaned.startsWith('82')) {
                        cleaned = '0' + cleaned.substring(2);
                    }
                    return cleaned;
                };

                const sessionPhone = normalizePhone(session.user.user_metadata?.phone);

                // Find matching user in mockUsers by email or phone number
                let matchedUser = mockUsers.find(u => {
                    const uEmail = String(u.email || '').toLowerCase();
                    const uPhone = normalizePhone(u.phone);
                    return (userEmail && uEmail === userEmail.toLowerCase()) || (sessionPhone && uPhone && uPhone === sessionPhone);
                });

                if (matchedUser) {
                    // Link Kakao/Google/Naver email to local user if not already linked
                    if (matchedUser.email.toLowerCase() !== userEmail.toLowerCase()) {
                        matchedUser.email = userEmail;
                        localStorage.setItem('gongbubang_mock_users', JSON.stringify(mockUsers));
                    }
                    
                    // Override session user_metadata with registered user info
                    session.user.user_metadata = {
                        ...session.user.user_metadata,
                        name: matchedUser.name,
                        phone: matchedUser.phone,
                        address: matchedUser.address,
                        children: matchedUser.user_metadata?.children || matchedUser.children || [],
                        role: 'parent',
                        status: matchedUser.status
                    };
                }

                const existsInMockUsers = mockUsers.some(u => {
                    const uEmail = String(u.email || '').toLowerCase();
                    const uPhone = normalizePhone(u.phone);
                    return (userEmail && uEmail === userEmail.toLowerCase()) || (sessionPhone && uPhone && uPhone === sessionPhone);
                });
                const existsInStudents = students.some(s => {
                    const sPhone = normalizePhone(s.phone);
                    const sParentPhone = normalizePhone(s.parentPhone);
                    return (sessionPhone && (sPhone === sessionPhone || sParentPhone === sessionPhone)) ||
                           (userEmail && (String(s.phone || '').toLowerCase() === userEmail.toLowerCase() || String(s.parentPhone || '').toLowerCase() === userEmail.toLowerCase()));
                });
                const hasChildrenMetadata = session.user.user_metadata?.children && session.user.user_metadata.children.length > 0;
                
                if (!existsInMockUsers && !existsInStudents && !hasChildrenMetadata) {
                    // Check if they are in the signup flow
                    if (sessionStorage.getItem('gongbubang_signup_flow') === 'true') {
                        console.log('[Auth Debug] New social signup detected. Opening profile modal.');
                        
                        // Show Step 2 in the signup modal
                        const stepSocial = document.getElementById('signup-step-social');
                        const stepProfile = document.getElementById('signup-step-profile');
                        if (stepSocial) stepSocial.style.display = 'none';
                        if (stepProfile) stepProfile.style.display = 'block';
                        
                        if (studentSignupModal) {
                            studentSignupModal.classList.add('open');
                        }
                        
                        const parentNameInput = document.getElementById('student-signup-name');
                        if (parentNameInput) {
                            parentNameInput.focus();
                        }
                        return; // Let them fill the profile form, do not sign out yet
                    } else {
                        console.log('[Auth Debug] Signout: Unregistered user');
                        alert('가입되지 않은 소셜 계정입니다. 먼저 학부모 회원가입을 완료해 주세요.');
                        supabase.auth.signOut();
                        return;
                    }
                }

                // Check matched user status
                if (matchedUser && matchedUser.status === 'pending') {
                    console.log('[Auth Debug] Signout: Pending user');
                    alert('승인 대기중입니다. 원장님의 승인 완료 후 이용 가능합니다.');
                    supabase.auth.signOut();
                    return;
                }
                if (matchedUser && matchedUser.status === 'terminated') {
                    console.log('[Auth Debug] Signout: Terminated user');
                    alert('관리자에 의해 종결된 계정입니다.');
                    supabase.auth.signOut();
                    return;
                }

                // They are a student/parent
                isStudent = true;
                isAdmin = false;

                const parentPhone = session.user.user_metadata?.phone || '';
                const childrenData = session.user.user_metadata?.children || [];

                // Sync linked students records with Supabase user metadata
                if (childrenData.length > 0) {
                    childrenData.forEach((c, idx) => {
                        const matched = students.find(s => s.name === c.name && (s.parentPhone === parentPhone || s.phone === c.phone));
                        if (matched && !String(matched.id).startsWith(session.user.id)) {
                            students = students.map(s => s.id === matched.id ? { 
                                ...s, 
                                id: `${session.user.id}-${idx}`,
                                sibling: childrenData.length > 1 ? `${childrenData.length - 1}명의 형제자매` : s.sibling 
                            } : s);
                        }
                    });
                    saveStudents();
                }

                // Retrieve all linked students
                let parentChildren = students.filter(s => String(s.id).startsWith(session.user.id));

                // If no records linked yet, auto-create them from children metadata
                if (parentChildren.length === 0 && childrenData.length > 0) {
                    childrenData.forEach((c, idx) => {
                        let age = 10;
                        if (c.birthdate) {
                            const birthYear = new Date(c.birthdate).getFullYear();
                            age = new Date().getFullYear() - birthYear + 1;
                        }
                        students.unshift({
                            id: `${session.user.id}-${idx}`,
                            name: c.name,
                            age,
                            school: '공부방 초등학교',
                            phone: c.phone || '',
                            parentPhone: parentPhone,
                            sibling: childrenData.length > 1 ? `${childrenData.length - 1}명의 형제자매` : '없음',
                            schedule: { mon: '', tue: '', wed: '', thu: '', fri: '' },
                            progress: '개념 완성 과정 등록 대기 중',
                            remarks: 'Supabase로 가입된 자녀입니다. 스케줄을 설정해 주세요.'
                        });
                    });
                    saveStudents();
                    parentChildren = students.filter(s => String(s.id).startsWith(session.user.id));
                }

                // If parent has children, set default selected child
                if (parentChildren.length > 0) {
                    const isOwnChild = parentChildren.some(c => c.id === loggedInStudentId);
                    if (!isOwnChild) {
                        loggedInStudentId = parentChildren[0].id;
                    }
                } else {
                    loggedInStudentId = session.user.id;
                }

                // Populate Child Selector Dropdown
                const childSelectContainer = document.getElementById('myclass-child-selector-container');
                const childSelect = document.getElementById('myclass-child-select');

                if (parentChildren.length > 1 && childSelectContainer && childSelect) {
                    childSelect.innerHTML = '';
                    parentChildren.forEach(child => {
                        const opt = document.createElement('option');
                        opt.value = child.id;
                        opt.textContent = `${child.name} (${child.school || '학생'})`;
                        if (child.id === loggedInStudentId) {
                            opt.selected = true;
                        }
                        childSelect.appendChild(opt);
                    });
                    
                    const newSelect = childSelect.cloneNode(true);
                    childSelect.parentNode.replaceChild(newSelect, childSelect);
                    
                    newSelect.addEventListener('change', () => {
                        loggedInStudentId = parseStudentId(newSelect.value);
                        renderMyClass();
                    });

                    childSelectContainer.style.display = 'block';
                } else {
                    if (childSelectContainer) childSelectContainer.style.display = 'none';
                }

                updateLoginButton();
                if (myclassSection) myclassSection.style.display = 'block';
                if (navLinkMyclass) navLinkMyclass.style.display = 'inline-block';
                if (drawerLinkMyclass) drawerLinkMyclass.style.display = 'block';

                if (btnAdminWrite) btnAdminWrite.style.display = 'none';
                if (studentSection) studentSection.style.display = 'none';
                if (navLinkStudents) navLinkStudents.style.display = 'none';
                if (drawerLinkStudents) drawerLinkStudents.style.display = 'none';

                renderMyClass();
            }
        } else {
            console.log('[Auth Debug] No session: cleaning up layout');
            // No session
            handleLogoutCleanup();
        }

        safeCreateIcons();
        renderNotices();
        if (isAdmin) renderStudents();
        
        // Auto-check callbackUrl and trigger login modal if not logged in
        if (session) {
            handleLoginSuccessRedirection();
        } else {
            const urlParams = new URLSearchParams(window.location.search);
            const callbackUrl = urlParams.get('callbackUrl');
            if (callbackUrl) {
                sessionStorage.setItem('login_callback_url', callbackUrl);
                setTimeout(() => {
                    const studentLoginModal = document.getElementById('login-modal');
                    if (studentLoginModal) {
                        studentLoginModal.classList.add('open');
                        showToast('로그인이 필요한 페이지입니다. 로그인해 주세요.');
                    }
                }, 300);
            }
        }
    });

    // Bind parent calendar navigation click listeners once
        const btnMyClassCalPrev = document.getElementById('btn-myclass-cal-prev');
        const btnMyClassCalNext = document.getElementById('btn-myclass-cal-next');
        if (btnMyClassCalPrev) {
            btnMyClassCalPrev.addEventListener('click', () => {
                if (!loggedInStudentId) return;
                if (myClassCalMonth === null) {
                    const today = new Date();
                    myClassCalYear = today.getFullYear();
                    myClassCalMonth = today.getMonth();
                }
                if (myClassCalMonth === 0) {
                    myClassCalMonth = 11;
                    myClassCalYear--;
                } else {
                    myClassCalMonth--;
                }
                renderCalendar(loggedInStudentId, myClassCalYear, myClassCalMonth, 'myclass-calendar-grid-days', false);
            });
        }
        if (btnMyClassCalNext) {
            btnMyClassCalNext.addEventListener('click', () => {
                if (!loggedInStudentId) return;
                if (myClassCalMonth === null) {
                    const today = new Date();
                    myClassCalYear = today.getFullYear();
                    myClassCalMonth = today.getMonth();
                }
                if (myClassCalMonth === 11) {
                    myClassCalMonth = 0;
                    myClassCalYear++;
                } else {
                    myClassCalMonth++;
                }
                renderCalendar(loggedInStudentId, myClassCalYear, myClassCalMonth, 'myclass-calendar-grid-days', false);
            });
        }

        // ==========================================================================
        // Class Management (LMS Class / Schedule Administration)
        // ==========================================================================
        const populateClassSelect = () => {
            const select = document.getElementById('student-class-select');
            if (select) {
                select.innerHTML = '<option value="">직접 입력 (반 없음)</option>';
                classes.forEach(c => {
                    const opt = document.createElement('option');
                    opt.value = c.id;
                    opt.textContent = c.name;
                    select.appendChild(opt);
                });
            }

            const batchSelect = document.getElementById('batch-progress-class-select');
            if (batchSelect) {
                batchSelect.innerHTML = '<option value="">-- 반 선택 --</option>';
                classes.forEach(c => {
                    const opt = document.createElement('option');
                    opt.value = c.id;
                    opt.textContent = c.name;
                    batchSelect.appendChild(opt);
                });
            }
        };

        const populateClassFilter = () => {
            const filter = document.getElementById('student-class-filter');
            if (!filter) return;
            const currentValue = filter.value;
            filter.innerHTML = '<option value="">전체 반 보기</option>';
            classes.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.textContent = c.name;
                if (String(c.id) === String(currentValue)) {
                    opt.selected = true;
                }
                filter.appendChild(opt);
            });

            // Populate the beautiful class filter tab pills
            populateClassTabs();
        };

        const populateClassTabs = () => {
            const container = document.getElementById('class-tabs-container');
            if (!container) return;
            
            const filterSelect = document.getElementById('student-class-filter');
            const activeId = filterSelect ? filterSelect.value : '';
            
            container.innerHTML = '';
            
            // "전체 반 보기" Tab
            const allBtn = document.createElement('button');
            allBtn.type = 'button';
            allBtn.className = `class-tab ${activeId === '' ? 'active' : ''}`;
            allBtn.textContent = '전체 반 보기';
            allBtn.setAttribute('data-class-id', '');
            allBtn.addEventListener('click', () => {
                if (filterSelect) {
                    filterSelect.value = '';
                    filterSelect.dispatchEvent(new Event('change'));
                }
            });
            container.appendChild(allBtn);
            
            // Class Tabs
            classes.forEach(c => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = `class-tab ${String(c.id) === String(activeId) ? 'active' : ''}`;
                btn.textContent = c.name;
                btn.setAttribute('data-class-id', c.id);
                btn.addEventListener('click', () => {
                    if (filterSelect) {
                        filterSelect.value = c.id;
                        filterSelect.dispatchEvent(new Event('change'));
                    }
                });
                container.appendChild(btn);
            });
        };

        const renderClassList = () => {
            try {
                const container = document.getElementById('class-list-container');
                if (!container) return;
                
                container.innerHTML = '';
                if (!Array.isArray(classes) || classes.length === 0) {
                    container.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--text-muted); font-size: 0.85rem;">등록된 반이 없습니다.</div>';
                    return;
                }
                
                classes.forEach(c => {
                    if (!c) return;
                    const item = document.createElement('div');
                    item.style.display = 'flex';
                    item.style.justifyContent = 'space-between';
                    item.style.alignItems = 'center';
                    item.style.padding = '10px 12px';
                    item.style.border = '1px solid var(--border-color)';
                    item.style.borderRadius = '8px';
                    item.style.background = '#ffffff';
                    
                    // Format schedule summary
                    const schedList = [];
                    const dayNames = { mon: '월', tue: '화', wed: '수', thu: '목', fri: '금' };
                    Object.keys(dayNames).forEach(day => {
                        if (c.schedule && c.schedule[day]) {
                            schedList.push(`${dayNames[day]}: ${c.schedule[day]}`);
                        }
                    });
                    const schedSummary = schedList.length > 0 ? schedList.join(', ') : '지정된 수업시간 없음';
                    
                    item.innerHTML = `
                        <div style="flex-grow: 1; padding-right: 12px; text-align: left;">
                            <div style="font-weight: 700; font-size: 0.88rem; color: var(--text-primary);">${c.name}</div>
                            <div style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 2px;">${schedSummary}</div>
                        </div>
                        <div style="display: flex; gap: 6px; flex-shrink: 0;">
                            <button type="button" class="btn-class-edit" data-id="${c.id}" style="padding: 4px 8px; font-size: 0.75rem; border-radius: 6px; border: 1px solid var(--border-color); background: #f8fafc; cursor: pointer;">수정</button>
                            <button type="button" class="btn-class-delete" data-id="${c.id}" style="padding: 4px 8px; font-size: 0.75rem; border-radius: 6px; border: 1px solid #ef4444; background: #fee2e2; color: #ef4444; cursor: pointer;">삭제</button>
                        </div>
                    `;
                    
                    // Attach edit listener
                    item.querySelector('.btn-class-edit').addEventListener('click', () => {
                        try {
                            document.getElementById('edit-class-id').value = c.id;
                            document.getElementById('class-name-input').value = c.name;
                            document.getElementById('class-duration-input').value = c.duration || 90;
                            
                            const monTime = splitTimeRange(c.schedule ? c.schedule.mon : '');
                            document.getElementById('class-time-mon-start').value = monTime.start;
                            document.getElementById('class-time-mon-end').value = monTime.end;
                            
                            const tueTime = splitTimeRange(c.schedule ? c.schedule.tue : '');
                            document.getElementById('class-time-tue-start').value = tueTime.start;
                            document.getElementById('class-time-tue-end').value = tueTime.end;
                            
                            const wedTime = splitTimeRange(c.schedule ? c.schedule.wed : '');
                            document.getElementById('class-time-wed-start').value = wedTime.start;
                            document.getElementById('class-time-wed-end').value = wedTime.end;
                            
                            const thuTime = splitTimeRange(c.schedule ? c.schedule.thu : '');
                            document.getElementById('class-time-thu-start').value = thuTime.start;
                            document.getElementById('class-time-thu-end').value = thuTime.end;
                            
                            const friTime = splitTimeRange(c.schedule ? c.schedule.fri : '');
                            document.getElementById('class-time-fri-start').value = friTime.start;
                            document.getElementById('class-time-fri-end').value = friTime.end;
                        } catch (err) {
                            console.error('Error editing class:', err);
                            alert('반 수정 불러오기 중 에러: ' + err.message);
                        }
                    });
                    
                    // Attach delete listener
                    item.querySelector('.btn-class-delete').addEventListener('click', () => {
                        try {
                            if (confirm(`'${c.name}' 반을 삭제하시겠습니까? (이 반에 소속된 학생들은 '반 없음'으로 변경됩니다.)`)) {
                                classes = classes.filter(cls => cls.id !== c.id);
                                saveClasses();
                                
                                // Update students classId to null
                                students = students.map(s => {
                                    if (s && String(s.classId) === String(c.id)) {
                                        return { ...s, classId: null };
                                    }
                                    return s;
                                });
                                saveStudents();
                                
                                renderClassList();
                                populateClassSelect();
                                populateClassFilter();
                                renderStudents(studentSearchInput ? studentSearchInput.value : '');
                                showToast('반이 삭제되었습니다.');
                            }
                        } catch (err) {
                            console.error('Error deleting class:', err);
                            alert('반 삭제 중 에러: ' + err.message);
                        }
                    });
                    
                    container.appendChild(item);
                });
            } catch (err) {
                console.error('Error in renderClassList:', err);
                alert('renderClassList 중 에러 발생: ' + err.message + '\n' + err.stack);
            }
        };

        // Form submission for classes
        const classEditorForm = document.getElementById('class-editor-form');
        if (classEditorForm) {
            classEditorForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const editId = document.getElementById('edit-class-id').value;
                const name = document.getElementById('class-name-input').value.trim();
                const duration = parseInt(document.getElementById('class-duration-input').value, 10) || 90;
                const schedule = {
                    mon: joinTimeRange(document.getElementById('class-time-mon-start').value, document.getElementById('class-time-mon-end').value),
                    tue: joinTimeRange(document.getElementById('class-time-tue-start').value, document.getElementById('class-time-tue-end').value),
                    wed: joinTimeRange(document.getElementById('class-time-wed-start').value, document.getElementById('class-time-wed-end').value),
                    thu: joinTimeRange(document.getElementById('class-time-thu-start').value, document.getElementById('class-time-thu-end').value),
                    fri: joinTimeRange(document.getElementById('class-time-fri-start').value, document.getElementById('class-time-fri-end').value)
                };
                
                if (editId) {
                    const id = parseStudentId(editId);
                    classes = classes.map(c => {
                        if (c.id === id) {
                            return { ...c, name, duration, schedule };
                        }
                        return c;
                    });
                    saveClasses();
                    showToast('반 정보가 수정되었습니다.');
                } else {
                    const newClass = {
                        id: Date.now(),
                        name,
                        duration,
                        schedule
                    };
                    classes.push(newClass);
                    saveClasses();
                    showToast('새로운 반이 등록되었습니다.');
                }
                
                classEditorForm.reset();
                document.getElementById('edit-class-id').value = '';
                document.getElementById('class-duration-input').value = 90;
                
                renderClassList();
                populateClassSelect();
                populateClassFilter();
                renderStudents(studentSearchInput ? studentSearchInput.value : '');
            });
            
            const btnClassClear = document.getElementById('btn-class-clear');
            if (btnClassClear) {
                btnClassClear.addEventListener('click', () => {
                    classEditorForm.reset();
                    document.getElementById('edit-class-id').value = '';
                    document.getElementById('class-duration-input').value = 90;
                });
            }
        }

        // Inline layout doesn't require modal triggers.


        // Apply time input formatters to class schedule editor fields
        document.querySelectorAll('#class-editor-form .time-input').forEach(el => {
            el.addEventListener('input', handleTimeInput);
        });

        const updateClassEndTimeForInput = (startInput) => {
            const startVal = startInput.value;
            const durationInput = document.getElementById('class-duration-input');
            if (startVal.length === 5 && durationInput) {
                const duration = parseInt(durationInput.value, 10) || 0;
                if (duration > 0) {
                    const endInputId = startInput.id.replace('-start', '-end');
                    const endInput = document.getElementById(endInputId);
                    if (endInput) {
                        endInput.value = calculateEndTime(startVal, duration);
                    }
                }
            }
        };

        // Attach class end time auto-calculation to start time inputs in class form
        document.querySelectorAll('#class-editor-form .time-input[id$="-start"]').forEach(el => {
            el.addEventListener('input', (e) => {
                updateClassEndTimeForInput(e.target);
            });
        });

        // Update class end times when class duration is modified
        const classDurationInput = document.getElementById('class-duration-input');
        if (classDurationInput) {
            classDurationInput.addEventListener('input', () => {
                const duration = parseInt(classDurationInput.value, 10) || 0;
                if (duration > 0) {
                    document.querySelectorAll('#class-editor-form .time-input[id$="-start"]').forEach(startInput => {
                        const startVal = startInput.value;
                        if (startVal.length === 5) {
                            const endInputId = startInput.id.replace('-start', '-end');
                            const endInput = document.getElementById(endInputId);
                            if (endInput) {
                                endInput.value = calculateEndTime(startVal, duration);
                            }
                        }
                    });
                }
            });
        }

        // Add change listener to student class selector to automatically populate schedule fields
        const studentClassSelect = document.getElementById('student-class-select');
        if (studentClassSelect) {
            studentClassSelect.addEventListener('change', () => {
                const classId = studentClassSelect.value;
                const studentClassDurationInput = document.getElementById('student-class-duration');
                const timeInputs = [
                    studentTimeMonStart, studentTimeMonEnd,
                    studentTimeTueStart, studentTimeTueEnd,
                    studentTimeWedStart, studentTimeWedEnd,
                    studentTimeThuStart, studentTimeThuEnd,
                    studentTimeFriStart, studentTimeFriEnd
                ];
                
                if (classId) {
                    const cls = classes.find(c => String(c.id) === String(classId));
                    if (cls) {
                        const monTime = splitTimeRange(cls.schedule.mon);
                        studentTimeMonStart.value = monTime.start;
                        studentTimeMonEnd.value = monTime.end;
                        
                        const tueTime = splitTimeRange(cls.schedule.tue);
                        studentTimeTueStart.value = tueTime.start;
                        studentTimeTueEnd.value = tueTime.end;
                        
                        const wedTime = splitTimeRange(cls.schedule.wed);
                        studentTimeWedStart.value = wedTime.start;
                        studentTimeWedEnd.value = wedTime.end;
                        
                        const thuTime = splitTimeRange(cls.schedule.thu);
                        studentTimeThuStart.value = thuTime.start;
                        studentTimeThuEnd.value = thuTime.end;
                        
                        const friTime = splitTimeRange(cls.schedule.fri);
                        studentTimeFriStart.value = friTime.start;
                        studentTimeFriEnd.value = friTime.end;
                        
                        if (studentClassDurationInput) {
                            studentClassDurationInput.value = cls.duration || 90;
                            studentClassDurationInput.disabled = true;
                        }
                        timeInputs.forEach(input => { if (input) input.disabled = true; });
                    }
                } else {
                    if (studentClassDurationInput) {
                        studentClassDurationInput.disabled = false;
                    }
                    timeInputs.forEach(input => { if (input) input.disabled = false; });
                }
            });
        }

        // Bind class filter change listener
        const studentClassFilter = document.getElementById('student-class-filter');
        if (studentClassFilter) {
            studentClassFilter.addEventListener('change', () => {
                const val = studentClassFilter.value;
                const tabs = document.querySelectorAll('.class-tab');
                tabs.forEach(tab => {
                    const classId = tab.getAttribute('data-class-id');
                    if (String(classId) === String(val)) {
                        tab.classList.add('active');
                    } else {
                        tab.classList.remove('active');
                    }
                });
                renderStudents(studentSearchInput ? studentSearchInput.value : '');
            });
        }
        // Auto-fill today's date on termination check
        if (studentTerminatedCheckbox && studentTerminationDateInput) {
            studentTerminatedCheckbox.addEventListener('change', () => {
                if (studentTerminatedCheckbox.checked) {
                    const today = new Date();
                    const year = today.getFullYear();
                    const month = String(today.getMonth() + 1).padStart(2, '0');
                    const day = String(today.getDate()).padStart(2, '0');
                    studentTerminationDateInput.value = `${year}-${month}-${day}`;
                } else {
                    studentTerminationDateInput.value = '';
                }
            });
        }

        // Student View Switching (Active vs Terminated)
        const btnViewActive = document.getElementById('btn-view-active');
        const btnViewTerminated = document.getElementById('btn-view-terminated');
        const terminatedYearFilterContainer = document.getElementById('terminated-year-filter-container');
        const terminatedYearFilter = document.getElementById('terminated-year-filter');
        const classTabsContainer = document.getElementById('class-tabs-container');

        if (btnViewActive && btnViewTerminated) {
            btnViewActive.addEventListener('click', () => {
                btnViewActive.classList.add('active');
                btnViewTerminated.classList.remove('active');
                currentStudentView = 'active';
                if (terminatedYearFilterContainer) terminatedYearFilterContainer.style.display = 'none';
                if (classTabsContainer) classTabsContainer.style.display = '';
                renderStudents(studentSearchInput ? studentSearchInput.value : '');
            });

            btnViewTerminated.addEventListener('click', () => {
                btnViewTerminated.classList.add('active');
                btnViewActive.classList.remove('active');
                currentStudentView = 'terminated';
                if (terminatedYearFilterContainer) terminatedYearFilterContainer.style.display = 'flex';
                if (classTabsContainer) classTabsContainer.style.display = 'none';
                populateTerminationYears();
                renderStudents(studentSearchInput ? studentSearchInput.value : '');
            });
        }

        if (terminatedYearFilter) {
            terminatedYearFilter.addEventListener('change', () => {
                currentTerminatedYear = terminatedYearFilter.value;
                renderStudents(studentSearchInput ? studentSearchInput.value : '');
            });
        }

        // Initialize class select dropdown inside student form
        populateClassSelect();
        populateClassFilter();
        renderClassList();
        renderMainScheduleTable();
        updateTotalStudentsCount();
        populateTerminationYears();

        // Default date for batch progress input to today
        const batchProgDateInput = document.getElementById('batch-progress-date-input');
        if (batchProgDateInput) {
            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            batchProgDateInput.value = `${yyyy}-${mm}-${dd}`;
        }

        // Batch Progress Registration Form Submit Listener
        const classProgressBatchForm = document.getElementById('class-progress-batch-form');
        if (classProgressBatchForm) {
            classProgressBatchForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const classSelect = document.getElementById('batch-progress-class-select');
                const dateInput = document.getElementById('batch-progress-date-input');
                const contentInput = document.getElementById('batch-progress-content-input');
                
                if (!classSelect || !dateInput || !contentInput) return;

                const classId = parseStudentId(classSelect.value);
                const date = dateInput.value;
                const content = contentInput.value.trim();

                if (!classId) {
                    showToast('진도를 등록할 반을 선택해 주세요.');
                    return;
                }

                // Find all students in this class
                const classStudents = students.filter(s => s.classId === classId);
                if (classStudents.length === 0) {
                    showToast('해당 반에 등록된 학생이 없습니다.');
                    return;
                }

                // Add progress for each student
                classStudents.forEach((student, index) => {
                    const newProg = {
                        id: Date.now() + Math.floor(Math.random() * 1000) + index,
                        studentId: student.id,
                        date: date,
                        content: content
                    };
                    progressList.unshift(newProg);
                });

                saveProgressList();
                renderStudents(studentSearchInput ? studentSearchInput.value : '');

                // Re-render myclass if student portal is open
                if (isStudent && loggedInStudentId) {
                    const currentStudent = students.find(s => s.id === loggedInStudentId);
                    if (currentStudent && currentStudent.classId === classId) {
                        renderMyClass();
                    }
                }

                // Reset content input but keep class and date selections for convenience
                contentInput.value = '';
                
                const selectedClass = classes.find(c => c.id === classId);
                showToast(`[진도 일괄 등록 완료] ${selectedClass ? selectedClass.name : '해당 반'} 원생 ${classStudents.length}명의 진도가 일괄 등록되었습니다.`);
            });
        }

        // ==========================================================================
        // 📞 상담 예약 문의 (Visitor Modal & Admin Management)
        // ==========================================================================

        const consultInquiryModal = document.getElementById('consult-inquiry-modal');
        const btnOpenConsultModal = document.getElementById('btn-open-consult-modal');
        const btnConsultInquiryClose = document.getElementById('btn-consult-inquiry-close');
        const consultInquiryForm = document.getElementById('consult-inquiry-form');
        const consultPhoneInput = document.getElementById('consult-phone');
        const consultListTbody = document.getElementById('consult-list-tbody');
        const consultTabBtns = document.querySelectorAll('.consult-tab-btn');
        const consultYearFilter = document.getElementById('consult-year-filter');
        const consultYearFilterContainer = document.getElementById('consult-year-filter-container');
        let currentConsultFilter = 'pending'; // default is pending (상담 미완료)
        let currentConsultYear = 'all';

        // Open/Close Visitor Modal
        if (btnOpenConsultModal && consultInquiryModal) {
            btnOpenConsultModal.addEventListener('click', () => {
                consultInquiryModal.classList.add('open');
                if (consultInquiryForm) consultInquiryForm.reset();
            });
        }

        if (btnConsultInquiryClose && consultInquiryModal) {
            btnConsultInquiryClose.addEventListener('click', () => {
                consultInquiryModal.classList.remove('open');
            });
        }

        if (consultInquiryModal) {
            consultInquiryModal.addEventListener('click', (e) => {
                if (e.target === consultInquiryModal) {
                    consultInquiryModal.classList.remove('open');
                }
            });
        }

        // Phone input formatter for consult form
        if (consultPhoneInput) {
            consultPhoneInput.addEventListener('input', handlePhoneInput);
        }

        // Form Submit for Consultation Inquiry
        if (consultInquiryForm) {
            consultInquiryForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const name = document.getElementById('consult-name').value.trim();
                const phone = document.getElementById('consult-phone').value.trim();
                const school = document.getElementById('consult-school').value.trim();
                const grade = document.getElementById('consult-grade').value;
                const memo = document.getElementById('consult-memo').value.trim();

                const newInquiry = {
                    id: Date.now(),
                    name,
                    phone,
                    school,
                    grade,
                    memo,
                    date: getFormattedDate().replace(/\.\s/g, '-').replace(/\.$/, ''), // YYYY-MM-DD format
                    status: 'pending'
                };

                consultations.unshift(newInquiry);
                saveConsultations();
                showToast('상담 예약 신청이 접수되었습니다. 원장님이 곧 연락드리겠습니다.');

                if (consultInquiryModal) consultInquiryModal.classList.remove('open');
                consultInquiryForm.reset();

                // Refresh Admin Panel if open
                if (isAdmin) renderConsultList();
            });
        }

        // Render Admin Consultations List Table
        // Populate Year Options for Consultation Filter
        const populateConsultYears = () => {
            if (!consultYearFilter) return;
            const prevValue = consultYearFilter.value;
            const years = [...new Set(consultations.map(c => {
                if (!c.date) return null;
                const yr = new Date(c.date).getFullYear();
                return isNaN(yr) ? null : yr;
            }).filter(Boolean))];
            years.sort((a, b) => b - a);

            let optionsHtml = '<option value="all">전체 년도</option>';
            years.forEach(yr => {
                optionsHtml += `<option value="${yr}">${yr}년</option>`;
            });
            consultYearFilter.innerHTML = optionsHtml;

            if (years.map(String).includes(prevValue) || prevValue === 'all') {
                consultYearFilter.value = prevValue;
            } else {
                consultYearFilter.value = 'all';
            }
            currentConsultYear = consultYearFilter.value;
        };

        const renderConsultList = () => {
            if (!consultListTbody) return;
            
            // Populate years dropdown dynamically based on latest data
            populateConsultYears();
            
            let filtered = consultations;
            if (currentConsultFilter === 'pending') {
                filtered = consultations.filter(c => c.status === 'pending');
            } else if (currentConsultFilter === 'completed') {
                filtered = consultations.filter(c => c.status === 'completed');
            } else if (currentConsultFilter === 'all') {
                if (currentConsultYear !== 'all') {
                    filtered = consultations.filter(c => {
                        if (!c.date) return false;
                        const yr = new Date(c.date).getFullYear().toString();
                        return yr === currentConsultYear;
                    });
                }
            }

            if (filtered.length === 0) {
                consultListTbody.innerHTML = `
                    <tr>
                        <td colspan="7" style="padding: 30px; text-align: center; color: var(--text-muted); font-weight: 500; font-size: 0.85rem;">
                            등록된 상담 예약 문의 내역이 없습니다.
                        </td>
                    </tr>
                `;
                return;
            }

            consultListTbody.innerHTML = filtered.map(c => {
                const isPending = c.status === 'pending';
                const checkboxTooltip = isPending ? '미완료 (클릭 시 완료 처리)' : '완료 (클릭 시 미완료 처리)';

                return `
                    <tr style="border-bottom: 1px solid var(--border-color-split);">
                        <td style="padding: 12px; text-align: center;">
                            <input type="checkbox" class="chk-toggle-status" data-id="${c.id}" ${!isPending ? 'checked' : ''} style="cursor: pointer; transform: scale(1.15); width: 16px; height: 16px;" title="${checkboxTooltip}">
                        </td>
                        <td style="padding: 12px; font-size: 0.8rem; color: var(--text-secondary); text-align: left;">${c.date}</td>
                        <td style="padding: 12px; font-weight: 700; font-size: 0.85rem; color: var(--text-primary); text-align: left;">${c.name}</td>
                        <td style="padding: 12px; font-size: 0.85rem; color: var(--text-primary); text-align: left;">${c.phone}</td>
                        <td style="padding: 12px; font-size: 0.82rem; color: var(--text-secondary); text-align: left;">
                            <div style="font-weight: 500;">${c.school}</div>
                            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">${c.grade}</div>
                        </td>
                        <td style="padding: 12px; font-size: 0.82rem; color: var(--text-primary); text-align: left; word-break: break-all; white-space: pre-line;">${c.memo || '<span style="color: var(--text-muted); font-style: italic;">내용 없음</span>'}</td>
                        <td style="padding: 12px; text-align: center;">
                            <button type="button" class="btn-delete-consult" data-id="${c.id}" style="background: none; border: none; color: var(--error-color); cursor: pointer; padding: 4px;" aria-label="삭제"><i data-lucide="trash-2" style="width: 16px; height: 16px;"></i></button>
                        </td>
                    </tr>
                `;
            }).join('');

            safeCreateIcons();
        };

        // Year selector listener
        if (consultYearFilter) {
            consultYearFilter.addEventListener('change', (e) => {
                currentConsultYear = e.target.value;
                renderConsultList();
            });
        }

        // Filter Tabs for Consultations
        consultTabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                consultTabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentConsultFilter = btn.getAttribute('data-filter');
                
                // Show/hide year filter based on tab
                if (consultYearFilterContainer) {
                    if (currentConsultFilter === 'all') {
                        consultYearFilterContainer.style.display = 'flex';
                    } else {
                        consultYearFilterContainer.style.display = 'none';
                    }
                }
                
                renderConsultList();
            });
        });

        // Click delegation on Consultations Table Body
        if (consultListTbody) {
            consultListTbody.addEventListener('click', (e) => {
                const chkToggle = e.target.closest('.chk-toggle-status');
                if (chkToggle) {
                    const id = Number(chkToggle.getAttribute('data-id'));
                    const isChecked = chkToggle.checked;
                    const nextStatus = isChecked ? 'completed' : 'pending';
                    const consult = consultations.find(c => c.id === id);
                    if (consult) {
                        consult.status = nextStatus;
                        saveConsultations();
                        showToast(nextStatus === 'completed' ? '상담 완료 처리되었습니다.' : '상담 미완료 처리되었습니다.');
                        renderConsultList();
                    }
                    return;
                }

                const btnDelete = e.target.closest('.btn-delete-consult');
                if (btnDelete) {
                    const id = Number(btnDelete.getAttribute('data-id'));
                    if (confirm('이 상담 예약 신청 내역을 정말 삭제하시겠습니까?')) {
                        consultations = consultations.filter(c => c.id !== id);
                        saveConsultations();
                        showToast('상담 내역이 삭제되었습니다.');
                        renderConsultList();
                    }
                    return;
                }
            });
        }


        // ==========================================================================
        // 📚 커리큘럼 소개 동적 렌더링 및 관리자 CRUD
        // ==========================================================================

        const curriculumGridContainer = document.getElementById('curriculum-grid-container');
        const curriculumListContainer = document.getElementById('curriculum-list-container');
        const curriculumEditorForm = document.getElementById('curriculum-editor-form');
        const editCurriculumIdInput = document.getElementById('edit-curriculum-id');
        const curriculumTitleInput = document.getElementById('curriculum-title');
        const curriculumStepNumInput = document.getElementById('curriculum-step-num');
        const curriculumDescInput = document.getElementById('curriculum-desc');
        const curriculumTargetsInput = document.getElementById('curriculum-targets');
        const btnCurriculumClear = document.getElementById('btn-curriculum-clear');
        const curriculumEditorTitle = document.getElementById('curriculum-editor-title');

        // Render curriculum cards on home page
        const renderCurriculumGrid = () => {
            if (!curriculumGridContainer) return;
            
            const sorted = [...curriculums].sort((a, b) => {
                const aNum = parseInt(a.stepNum) || a.id;
                const bNum = parseInt(b.stepNum) || b.id;
                return aNum - bNum;
            });

            curriculumGridContainer.innerHTML = sorted.map((c, index) => {
                const stepClass = `card-step${(index % 3) + 1}`;
                const targetsHtml = (c.targets || []).map(t => `<span>${t.trim()}</span>`).join('');

                return `
                    <div class="curriculum-card ${stepClass}">
                        <div class="step-num">${c.stepNum}</div>
                        <h3 class="step-title">${c.title}</h3>
                        <p class="step-desc">${c.description}</p>
                        <div class="step-targets">
                            ${targetsHtml}
                        </div>
                    </div>
                `;
            }).join('');
        };

        // Render curriculum list in admin panel
        const renderAdminCurriculumList = () => {
            if (!curriculumListContainer) return;

            const sorted = [...curriculums].sort((a, b) => {
                const aNum = parseInt(a.stepNum) || a.id;
                const bNum = parseInt(b.stepNum) || b.id;
                return aNum - bNum;
            });

            if (sorted.length === 0) {
                curriculumListContainer.innerHTML = `
                    <div style="padding: 20px; text-align: center; color: var(--text-muted); font-size: 0.88rem;">
                        등록된 커리큘럼 단계가 없습니다.
                    </div>
                `;
                return;
            }

            curriculumListContainer.innerHTML = sorted.map(c => {
                return `
                    <div style="background: #ffffff; border: 1px solid var(--border-color-split); border-radius: var(--border-radius-base); padding: 12px 14px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <div style="display: flex; flex-direction: column; gap: 2px;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span style="background: var(--primary-bg); color: var(--primary-color); font-weight: 700; font-size: 0.72rem; padding: 2px 6px; border-radius: 4px; font-family: var(--ff-logo);">${c.stepNum}</span>
                                <span style="font-weight: 700; font-size: 0.88rem; color: var(--text-primary);">${c.title}</span>
                            </div>
                            <span style="font-size: 0.75rem; color: var(--text-muted); max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 4px;">${c.description}</span>
                        </div>
                        <div style="display: flex; gap: 4px;">
                            <button type="button" class="btn-edit-curriculum" data-id="${c.id}" style="background: none; border: none; color: var(--primary-color); cursor: pointer; padding: 4px;" aria-label="수정"><i data-lucide="edit" style="width: 16px; height: 16px;"></i></button>
                            <button type="button" class="btn-delete-curriculum" data-id="${c.id}" style="background: none; border: none; color: var(--error-color); cursor: pointer; padding: 4px;" aria-label="삭제"><i data-lucide="trash-2" style="width: 16px; height: 16px;"></i></button>
                        </div>
                    </div>
                `;
            }).join('');

            safeCreateIcons();
        };

        // Form Submit for Curriculum Editor
        if (curriculumEditorForm) {
            curriculumEditorForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const id = editCurriculumIdInput.value;
                const title = curriculumTitleInput.value.trim();
                const stepNum = curriculumStepNumInput.value.trim();
                const description = curriculumDescInput.value.trim();
                const targets = curriculumTargetsInput.value.split(',').map(t => t.trim()).filter(Boolean);

                if (id) {
                    curriculums = curriculums.map(c => {
                        if (String(c.id) === String(id)) {
                            return { ...c, title, stepNum, description, targets };
                        }
                        return c;
                    });
                    showToast('커리큘럼 단계가 성공적으로 수정되었습니다.');
                } else {
                    const newStep = {
                        id: Date.now(),
                        title,
                        stepNum,
                        description,
                        targets
                    };
                    curriculums.push(newStep);
                    showToast('새로운 커리큘럼 단계가 등록되었습니다.');
                }

                saveCurriculums();
                resetCurriculumForm();
                renderCurriculumGrid();
                renderAdminCurriculumList();
            });
        }

        // Reset Curriculum Form
        const resetCurriculumForm = () => {
            if (curriculumEditorForm) curriculumEditorForm.reset();
            if (editCurriculumIdInput) editCurriculumIdInput.value = '';
            if (curriculumEditorTitle) {
                curriculumEditorTitle.innerHTML = `<i data-lucide="plus-circle" style="width: 18px; height: 18px;"></i> 커리큘럼 등록 / 수정`;
            }
            safeCreateIcons();
        };

        if (btnCurriculumClear) {
            btnCurriculumClear.addEventListener('click', resetCurriculumForm);
        }

        // Click delegation on Curriculum Admin List
        if (curriculumListContainer) {
            curriculumListContainer.addEventListener('click', (e) => {
                const btnEdit = e.target.closest('.btn-edit-curriculum');
                if (btnEdit) {
                    const id = Number(btnEdit.getAttribute('data-id'));
                    const item = curriculums.find(c => c.id === id);
                    if (item) {
                        editCurriculumIdInput.value = item.id;
                        curriculumTitleInput.value = item.title;
                        curriculumStepNumInput.value = item.stepNum;
                        curriculumDescInput.value = item.description;
                        curriculumTargetsInput.value = (item.targets || []).join(', ');
                        
                        if (curriculumEditorTitle) {
                            curriculumEditorTitle.innerHTML = `<i data-lucide="edit" style="width: 18px; height: 18px;"></i> 커리큘럼 수정 (단계: ${item.stepNum})`;
                        }
                        safeCreateIcons();
                    }
                    return;
                }

                const btnDelete = e.target.closest('.btn-delete-curriculum');
                if (btnDelete) {
                    const id = Number(btnDelete.getAttribute('data-id'));
                    if (confirm('이 커리큘럼 단계를 정말 삭제하시겠습니까?')) {
                        curriculums = curriculums.filter(c => c.id !== id);
                        saveCurriculums();
                        showToast('커리큘럼 단계가 삭제되었습니다.');
                        resetCurriculumForm();
                        renderCurriculumGrid();
                        renderAdminCurriculumList();
                    }
                    return;
                }
            });
        }

        // ==========================================================================
        // 🤖 AI Solver (Student Query & Admin History Viewer)
        // ==========================================================================

        const getMockAiResponse = (question) => {
            const q = question.toLowerCase();
            if (q.includes('x^2') || q.includes('이차방정식') || q.includes('근의 공식') || q.includes('근의공식')) {
                return `이차방정식 풀이과정입니다.

**1. 인수분해를 이용한 풀이:**
이차방정식 \\(ax^2 + bx + c = 0\\)의 일반적인 풀이를 위해 인수분해를 시도합니다. 곱해서 \\(ac\\), 더해서 \\(b\\)가 되는 두 수 \\(p, q\\)를 찾아 다음과 같이 인수분해합니다.
\\[(x - p)(x - q) = 0 \\implies x = p \\quad \\text{또는} \\quad x = q\\]

**2. 근의 공식을 이용한 풀이:**
인수분해가 어려운 경우 이차방정식 근의 공식을 적용합니다.
\\[x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}\\]

예시로 \\(x^2 - 5x + 6 = 0\\)의 경우:
\\(a = 1, b = -5, c = 6\\)을 근의 공식에 대입하면:
\\[x = \\frac{-(-5) \\pm \\sqrt{(-5)^2 - 4 \\cdot 1 \\cdot 6}}{2 \\cdot 1}\\]
\\[x = \\frac{5 \\pm \\sqrt{25 - 24}}{2} = \\frac{5 \\pm 1}{2}\\]
따라서 구하는 해는 \\(x = 3\\) 또는 \\(x = 2\\)가 됩니다.`;
            } else if (q.includes('피타고라스') || q.includes('직각삼각형') || q.includes('빗변')) {
                return `**피타고라스 정리(Pythagorean Theorem)** 공식과 설명입니다.

**1. 기본 정의:**
직각삼각형에서 직각을 끼고 있는 두 변의 길이를 각각 \\(a, b\\)라 하고, 가장 긴 변(빗변)의 길이를 \\(c\\)라고 할 때 다음 공식이 항상 성립합니다.
\\[a^2 + b^2 = c^2\\]

**2. 변의 길이 구하기 예시:**
- **빗변 \\(c\\) 구하기:** 두 변의 길이가 \\(3\\)과 \\(4\\)인 직각삼각형의 빗변 길이는:
  \\[c = \\sqrt{a^2 + b^2} = \\sqrt{3^2 + 4^2} = \\sqrt{9 + 16} = \\sqrt{25} = 5\\]
- **다른 한 변 \\(a\\) 구하기:** 빗변이 \\(10\\)이고 한 변이 \\(8\\)일 때 다른 변의 길이는:
  \\[a = \\sqrt{c^2 - b^2} = \\sqrt{10^2 - 8^2} = \\sqrt{100 - 64} = \\sqrt{36} = 6\\]

피타고라스 정리를 활용하면 직각삼각형의 두 변의 길이를 알 때 나머지 한 변의 길이를 아주 쉽게 계산할 수 있습니다.`;
            } else if (q.includes('sin') || q.includes('cos') || q.includes('tan') || q.includes('삼각함수') || q.includes('삼각비')) {
                return `**삼각함수(Trigonometric Functions)** 공식과 특수각의 값입니다.

**1. 삼각비의 기본 정의:**
직각삼각형에서 한 예각을 \\(\\theta\\), 밑변을 \\(x\\), 높이를 \\(y\\), 빗변을 \\(r\\)이라 할 때:
- **사인 (Sine):** \\(\\sin\\theta = \\frac{\\text{높이}}{\\text{빗변}} = \\frac{y}{r}\\)
- **코사인 (Cosine):** \\(\\cos\\theta = \\frac{\\text{밑변}}{\\text{빗변}} = \\frac{x}{r}\\)
- **탄젠트 (Tangent):** \\(\\tan\\theta = \\frac{\\text{높이}}{\\text{밑변}} = \\frac{y}{x}\\)

**2. 자주 쓰는 특수각의 삼각비 표:**
\\[
\\begin{array}{c|c|c|c}
\\text{각도 } (\\theta) & 30^\\circ \\left(\\frac{\\pi}{6}\\right) & 45^\\circ \\left(\\frac{\\pi}{4}\\right) & 60^\\circ \\left(\\frac{\\pi}{3}\\right) \\\\ \\hline
\\sin\\theta & \\frac{1}{2} & \\frac{\\sqrt{2}}{2} & \\frac{\\sqrt{3}}{2} \\\\ \\hline
\\cos\\theta & \\frac{\\sqrt{3}}{2} & \\frac{\\sqrt{2}}{2} & \\frac{1}{2} \\\\ \\hline
\\tan\\theta & \\frac{\\sqrt{3}}{3} & 1 & \\sqrt{3}
\\end{array}
\\]

**3. 삼각함수의 기본 공식:**
- \\(\\sin^2\\theta + \\cos^2\\theta = 1\\)
- \\(\\tan\\theta = \\frac{\\sin\\theta}{\\cos\\theta}\\)`;
            } else if (q.includes('미분') || q.includes('적분') || q.includes('도함수')) {
                return `**미분과 적분(Calculus) 기본 공식**입니다.

**1. 미분 공식 (Differentiation):**
함수 \\(f(x)\\)의 변화율을 나타내는 도함수를 구하는 공식입니다.
- **다항함수의 미분:** \\(\\frac{d}{dx}(x^n) = n x^{n-1}\\) (단, \\(n\\)은 실수)
- **상수함수의 미분:** \\(\\frac{d}{dx}(c) = 0\\)
- **곱의 미분법:** \\(\\{f(x)g(x)\\}' = f'(x)g(x) + f(x)g'(x)\\)

*예시:* \\(f(x) = 3x^2 + 5x - 2\\)의 미분은:
\\[f'(x) = 6x + 5\\]

**2. 부정적분 공식 (Indefinite Integration):**
미분의 역과정으로 원래 함수를 찾는 공식입니다. (\\(C\\)는 적분상수)
- **다항함수의 적분:** \\(\\int x^n dx = \\frac{1}{n+1} x^{n+1} + C\\) (단, \\(n \\neq -1\\))
- **상수함수의 적분:** \\(\\int a dx = ax + C\\)

*예시:* \\(\\int (6x + 5) dx\\)의 적분은:
\\[6 \\cdot \\frac{1}{2}x^2 + 5x + C = 3x^2 + 5x + C\\]`;
            } else if (q.includes('인수분해') || q.includes('곱셈 공식') || q.includes('곱셈공식')) {
                return `**인수분해(Factorization) 및 곱셈 공식**의 주요 양식입니다.

**1. 주요 곱셈 공식 및 인수분해 공식:**
- **완전제곱식:**
  \\[(a + b)^2 = a^2 + 2ab + b^2 \\iff a^2 + 2ab + b^2 = (a + b)^2\\]
  \\[(a - b)^2 = a^2 - 2ab + b^2 \\iff a^2 - 2ab + b^2 = (a - b)^2\\]
- **합차 공식:**
  \\[(a + b)(a - b) = a^2 - b^2 \\iff a^2 - b^2 = (a + b)(a - b)\\]
- **이차식의 인수분해:**
  \\[(x + a)(x + b) = x^2 + (a+b)x + ab \\iff x^2 + (a+b)x + ab = (x + a)(x + b)\\]

**2. 인수분해 대입 예시:**
다항식 \\(x^2 - 4\\)의 인수분해는 합차 공식을 사용하여 다음과 같이 나타냅니다.
\\[x^2 - 4 = x^2 - 2^2 = (x + 2)(x - 2)\\]

인수분해는 복잡한 다항식을 일차식들의 곱으로 표현하여 방정식의 해를 찾기 쉽게 해주는 아주 유용한 수학적 기법입니다.`;
            } else {
                return `안녕하세요! AI 수학 선생님입니다. 
질문하신 **"${question}"** 문제에 대한 개념 분석 및 문제 해결을 위한 단계별 접근법입니다.

**1단계: 문제 상황 파악 및 정의하기**
질문하신 개념이나 문제는 주어진 조건과 구하고자 하는 목표값을 명확히 구분하는 것부터 시작합니다.
- 주어진 조건: 질문에 포함된 수학적 개념
- 해결 목표: 공식 유도 또는 문제 풀이 단계 도출

**2단계: 수학적 성질 및 공식 떠올리기**
이와 같은 유형의 문제는 아래의 기본 수학 공식을 기반으로 접근할 수 있습니다.
\\[\\text{성질 또는 공식} : A \\cdot x + B = C\\]
- 변수가 포함된 경우, 양변의 연산을 통해 하나의 문자(예: \\(x\\))로 식을 정리합니다.
- 성질 설명: 관련 단원의 주요 정의 및 정리들을 대입해 봅니다.

**3단계: 단계별 풀이 접근 방식**
1. 식의 단순화: 괄호를 풀고 동류항끼리 묶어 식의 복잡도를 낮춥니다.
2. 미지수 구하기: 상수를 반대편 항으로 이항하여 미지수의 계수로 나누어 줍니다.
3. 검산: 도출된 임계값을 최초 수식에 대입하여 등호가 성립하는지 확인합니다.

더 궁금하신 구체적인 수식이나 풀이를 적어주시면 더 자세하게 안내해 드리겠습니다!`;
            }
        };

        const btnAskAi = document.getElementById('btn-ask-ai');
        const aiQueryInput = document.getElementById('ai-query-input');
        const aiResponseContainer = document.getElementById('ai-response-container');
        const aiResponseContent = document.getElementById('ai-response-content');

        if (btnAskAi && aiQueryInput && aiResponseContainer && aiResponseContent) {
            btnAskAi.addEventListener('click', () => {
                const queryText = aiQueryInput.value.trim();
                if (!queryText) {
                    showToast('질문할 수학 문제나 개념을 입력해 주세요.');
                    return;
                }

                // Show loading state
                btnAskAi.disabled = true;
                btnAskAi.innerHTML = `AI 선생님 문제 해결 중...`;
                aiResponseContainer.style.display = 'none';

                setTimeout(() => {
                    // Generate AI response
                    const responseText = getMockAiResponse(queryText);
                    
                    // Format response text
                    aiResponseContent.innerHTML = responseText.replace(/\n/g, '<br>');
                    aiResponseContainer.style.display = 'flex';
                    
                    // Re-render LaTeX math expressions using KaTeX
                    if (typeof renderMathInElement === 'function') {
                        renderMathInElement(aiResponseContent, {
                            delimiters: [
                                {left: '$$', right: '$$', display: true},
                                {left: '$', right: '$', display: false},
                                {left: '\\(', right: '\\)', display: false},
                                {left: '\\[', right: '\\]', display: true}
                            ],
                            throwOnError: false
                        });
                    }

                    // Reset button
                    btnAskAi.disabled = false;
                    btnAskAi.innerHTML = `<i data-lucide="sparkles" style="width: 16px; height: 16px;"></i> AI에게 풀이 물어보기`;
                    safeCreateIcons();

                    // Save query in our localStorage database
                    const currentStudent = students.find(s => s.id === loggedInStudentId);
                    const name = currentStudent ? currentStudent.name : '학부모 자녀';
                    
                    const newQuery = {
                        id: Date.now(),
                        studentId: loggedInStudentId,
                        studentName: name,
                        question: queryText,
                        answer: responseText,
                        date: getFormattedDate().replace(/\.\s/g, '-').replace(/\.$/, ''), // YYYY-MM-DD
                        timestamp: new Date().toTimeString().split(' ')[0] // HH:MM:SS
                    };

                    aiQueries.unshift(newQuery);
                    localStorage.setItem('gongbubang_ai_queries', JSON.stringify(aiQueries));
                    
                    // Clear input
                    aiQueryInput.value = '';

                    // Refresh history and admin panel
                    renderMyClassAiHistory();
                    if (isAdmin) renderAiQueryManagement();
                }, 1500);
            });
        }

        const renderMyClassAiHistory = () => {
            const historyList = document.getElementById('myclass-ai-history-list');
            const historyContainer = document.getElementById('myclass-ai-history-container');
            if (!historyList || !historyContainer) return;

            // Find all queries for the logged-in student
            const myQueries = aiQueries.filter(q => q.studentId === loggedInStudentId);

            if (myQueries.length === 0) {
                historyContainer.style.display = 'none';
                return;
            }

            historyContainer.style.display = 'flex';
            historyList.innerHTML = myQueries.slice(0, 3).map(q => {
                return `
                    <button type="button" class="btn-myclass-ai-history-item" data-id="${q.id}" style="text-align: left; background: none; border: 1px solid var(--border-color); border-radius: 8px; padding: 8px 12px; font-size: 0.8rem; cursor: pointer; color: var(--text-primary); transition: var(--transition-smooth); display: flex; justify-content: space-between; align-items: center; width: 100%; margin-top: 4px;">
                        <span style="font-weight: 600; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; max-width: 80%;">${q.question}</span>
                        <span style="font-size: 0.72rem; color: var(--text-muted);">${q.date}</span>
                    </button>
                `;
            }).join('');

            // Click listener for history items to restore them
            historyList.querySelectorAll('.btn-myclass-ai-history-item').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = Number(btn.getAttribute('data-id'));
                    const query = aiQueries.find(q => q.id === id);
                    if (query && aiResponseContainer && aiResponseContent) {
                        aiResponseContent.innerHTML = query.answer.replace(/\n/g, '<br>');
                        aiResponseContainer.style.display = 'flex';
                        
                        if (typeof renderMathInElement === 'function') {
                            renderMathInElement(aiResponseContent, {
                                delimiters: [
                                    {left: '$$', right: '$$', display: true},
                                    {left: '$', right: '$', display: false},
                                    {left: '\\(', right: '\\)', display: false},
                                    {left: '\\[', right: '\\]', display: true}
                                ],
                                throwOnError: false
                            });
                        }
                    }
                });
            });

            safeCreateIcons();
        };

        const aiQueryDateList = document.getElementById('ai-query-date-list');
        const aiQueryDetailContent = document.getElementById('ai-query-detail-content');

        const renderAiQueryManagement = () => {
            if (!aiQueryDateList) return;

            // Group queries by date
            const groupedByDate = {};
            aiQueries.forEach(q => {
                if (!groupedByDate[q.date]) {
                    groupedByDate[q.date] = [];
                }
                groupedByDate[q.date].push(q);
            });

            // Get dates sorted descending
            const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

            if (sortedDates.length === 0) {
                aiQueryDateList.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 0.85rem; padding: 20px 0;">질의 기록이 없습니다.</div>`;
                if (aiQueryDetailContent) {
                    aiQueryDetailContent.innerHTML = `
                        <div style="text-align: center; color: var(--text-muted); font-size: 0.88rem; width: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 250px;">
                            <i data-lucide="info" style="width: 32px; height: 32px; margin-bottom: 10px; color: #d9d9d9;"></i>
                            질문 내역이 비어 있습니다.
                        </div>
                    `;
                    safeCreateIcons();
                }
                return;
            }

            // Render list of dates and student names
            aiQueryDateList.innerHTML = sortedDates.map(date => {
                const queriesForDate = groupedByDate[date];
                const studentQueries = {};
                queriesForDate.forEach(q => {
                    if (!studentQueries[q.studentName]) {
                        studentQueries[q.studentName] = [];
                    }
                    studentQueries[q.studentName].push(q);
                });

                const studentNamesHtml = Object.keys(studentQueries).map(name => {
                    return `
                        <button type="button" class="btn-view-ai-query-detail" data-date="${date}" data-name="${name}" style="border: none; background: #ffffff; border: 1px solid var(--border-color); border-radius: 20px; padding: 6px 12px; font-size: 0.8rem; font-weight: 600; cursor: pointer; color: var(--text-primary); transition: var(--transition-smooth); display: flex; align-items: center; gap: 4px; height: 28px; line-height: 1;">
                            <i data-lucide="user" style="width: 12px; height: 12px; color: var(--text-secondary);"></i> ${name}
                            <span style="font-size: 0.7rem; background: #f0f0f0; color: var(--text-secondary); border-radius: 50%; width: 16px; height: 16px; display: inline-flex; align-items: center; justify-content: center; margin-left: 2px;">${studentQueries[name].length}</span>
                        </button>
                    `;
                }).join('');

                return `
                    <div class="ai-query-date-group" style="display: flex; flex-direction: column; gap: 8px;">
                        <div style="font-size: 0.8rem; font-weight: 700; color: var(--text-secondary); background: #f0f0f0; padding: 4px 10px; border-radius: 6px; display: inline-block; width: fit-content;">${date}</div>
                        <div style="display: flex; flex-wrap: wrap; gap: 6px; padding-left: 4px;">
                            ${studentNamesHtml}
                        </div>
                    </div>
                `;
            }).join('');

            // Click listener for buttons in the date list
            const detailBtns = aiQueryDateList.querySelectorAll('.btn-view-ai-query-detail');
            detailBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    detailBtns.forEach(b => {
                        b.style.background = '#ffffff';
                        b.style.borderColor = 'var(--border-color)';
                        b.style.color = 'var(--text-primary)';
                    });
                    btn.style.background = '#e6f4ff';
                    btn.style.borderColor = 'var(--primary-color)';
                    btn.style.color = 'var(--primary-color)';

                    const date = btn.getAttribute('data-date');
                    const name = btn.getAttribute('data-name');
                    showAiQueryDetails(date, name);
                });
            });

            safeCreateIcons();
        };

        const showAiQueryDetails = (date, name) => {
            if (!aiQueryDetailContent) return;

            // Find all queries matching this date and name
            const matchingQueries = aiQueries.filter(q => q.date === date && q.studentName === name);

            if (matchingQueries.length === 0) return;

            const queriesHtml = matchingQueries.map(q => {
                return `
                    <div style="border: 1px solid var(--border-color); border-radius: 12px; padding: 14px; background: #fafafa; display: flex; flex-direction: column; gap: 10px; width: 100%;">
                        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">
                            <span style="font-size: 0.78rem; color: var(--text-muted); font-weight: 600;"><i data-lucide="clock" style="width: 12px; height: 12px; display: inline-block; vertical-align: middle; margin-right: 2px;"></i> ${q.timestamp}</span>
                            <span style="font-size: 0.72rem; color: var(--primary-color); background: #e6f4ff; border: 1px solid #91caee; padding: 2px 8px; border-radius: 20px; font-weight: 700;">AI 질문</span>
                        </div>
                        <div style="font-size: 0.88rem; font-weight: 700; color: var(--text-primary); word-break: break-all; white-space: pre-wrap;"><span style="color: var(--primary-color); font-weight: 800; margin-right: 4px;">Q.</span>${q.question}</div>
                        
                        <div style="margin-top: 6px; border-top: 1px dashed var(--border-color); padding-top: 10px;">
                            <div style="font-size: 0.8rem; font-weight: 700; color: var(--success-color); margin-bottom: 4px; display: flex; align-items: center; gap: 4px;">
                                <i data-lucide="bot" style="width: 14px; height: 14px;"></i> AI 답변 풀이:
                            </div>
                            <div class="ai-query-solution-markdown" style="font-size: 0.85rem; line-height: 1.5; color: var(--text-primary); background: #ffffff; border: 1px solid var(--border-color); border-radius: 8px; padding: 12px; white-space: pre-wrap; font-family: var(--ff-primary); overflow-x: auto;">${q.answer}</div>
                        </div>
                    </div>
                `;
            }).join('');

            aiQueryDetailContent.innerHTML = `
                <div style="display: flex; flex-direction: column; gap: 14px; height: 100%; overflow-y: auto; max-height: 420px; padding-right: 4px; text-align: left; width: 100%;">
                    <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid var(--primary-color); padding-bottom: 8px; margin-bottom: 6px;">
                        <h4 style="font-size: 1.05rem; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 6px;">
                            <i data-lucide="user" style="color: var(--primary-color); width: 18px; height: 18px;"></i> ${name} 원생의 질문
                        </h4>
                        <span style="font-size: 0.85rem; font-weight: 700; color: var(--text-secondary);">${date}</span>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 16px;">
                        ${queriesHtml}
                    </div>
                </div>
            `;

            // Re-render LaTeX math in details panel using KaTeX
            const solutionBlocks = aiQueryDetailContent.querySelectorAll('.ai-query-solution-markdown');
            solutionBlocks.forEach(block => {
                if (typeof renderMathInElement === 'function') {
                    renderMathInElement(block, {
                        delimiters: [
                            {left: '$$', right: '$$', display: true},
                            {left: '$', right: '$', display: false},
                            {left: '\\(', right: '\\)', display: false},
                            {left: '\\[', right: '\\]', display: true}
                        ],
                        throwOnError: false
                    });
                }
            });

            safeCreateIcons();
        };

        // Unified user management DB initialization
        const initUsers = () => {
            let users = [];
            try {
                users = JSON.parse(localStorage.getItem('gongbubang_mock_users') || '[]');
            } catch(e){}
            
            if (users.length === 0) {
                const seededUsers = [
                    {
                        id: 'parent-1',
                        email: 'parent@test.com',
                        password: '123456',
                        name: '김부모',
                        phone: '010-9876-5432',
                        address: '서울시 강남구 역삼동 101호',
                        role: 'parent',
                        status: 'approved',
                        createdAt: new Date().toISOString(),
                        approvedAt: new Date().toISOString(),
                        user_metadata: {
                            name: '김부모',
                            phone: '010-9876-5432',
                            address: '서울시 강남구 역삼동 101호',
                            role: 'parent',
                            children: [
                                { name: '김민준', birthdate: '2016-01-01', phone: '010-1111-2222', username: 'minjun', password: '1234' },
                                { name: '김서아', birthdate: '2018-01-01', phone: '010-5555-6666', username: 'seoah', password: '1234' }
                            ]
                        }
                    },
                    {
                        id: 'parent-2',
                        email: 'parent2@test.com',
                        password: '123456',
                        name: '이부모',
                        phone: '010-4444-5555',
                        address: '서울시 서초구 반포동 202호',
                        role: 'parent',
                        status: 'approved',
                        createdAt: new Date().toISOString(),
                        approvedAt: new Date().toISOString(),
                        user_metadata: {
                            name: '이부모',
                            phone: '010-4444-5555',
                            address: '서울시 서초구 반포동 202호',
                            role: 'parent',
                            children: [
                                { name: '이서윤', birthdate: '2012-01-01', phone: '010-2222-3333', username: 'seoyun', password: '1234' }
                            ]
                        }
                    }
                ];
                localStorage.setItem('gongbubang_mock_users', JSON.stringify(seededUsers));
            }
            
            // Sync default student cards
            let updatedStudents = false;
            students = students.map(s => {
                let updated = { ...s };
                if (s.name === '김민준' && !s.username) {
                    updated.username = 'minjun';
                    updated.password = '1234';
                    updated.address = '서울시 강남구 역삼동 101호';
                    updatedStudents = true;
                } else if (s.name === '이서윤' && !s.username) {
                    updated.username = 'seoyun';
                    updated.password = '1234';
                    updated.address = '서울시 서초구 반포동 202호';
                    updatedStudents = true;
                } else if (s.name === '김서아' && !s.username) {
                    updated.username = 'seoah';
                    updated.password = '1234';
                    updated.address = '서울시 강남구 역삼동 101호';
                    updatedStudents = true;
                }
                return updated;
            });
            if (updatedStudents) {
                saveStudents();
            }
        };

        // Render Admin Approval Request Queue & User Termination Management
        const renderApprovalList = () => {
            const tbody = document.getElementById('approval-list-tbody');
            if (!tbody) return;
            tbody.innerHTML = '';
            
            const filterStatus = document.getElementById('approval-status-filter')?.value || 'pending';
            const filterYear = document.getElementById('approval-year-filter')?.value || 'all';
            
            const mockUsers = JSON.parse(localStorage.getItem('gongbubang_mock_users') || '[]');
            const parentUsers = mockUsers.filter(u => u.role === 'parent');
            
            let filtered = parentUsers.filter(u => {
                const status = u.status || 'pending';
                if (status !== filterStatus) return false;
                
                if (filterYear !== 'all') {
                    const dateStr = u.createdAt || u.approvedAt || u.terminatedAt || '';
                    if (!dateStr.includes(filterYear)) return false;
                }
                return true;
            });
            
            const countLabel = document.getElementById('approval-count-label');
            if (countLabel) {
                countLabel.textContent = `조회 결과: ${filtered.length}건`;
            }
            
            if (filtered.length === 0) {
                tbody.innerHTML = `<tr><td colspan="4" style="padding: 24px; text-align: center; color: var(--text-secondary);">해당 조건의 가입/신청 내역이 없습니다.</td></tr>`;
                return;
            }
            
            filtered.forEach(u => {
                const tr = document.createElement('tr');
                tr.style.borderBottom = '1px solid var(--border-color)';
                
                const childrenText = (u.user_metadata?.children || []).map(c => 
                    `<div style="font-size: 0.82rem; font-weight: 600; text-align: left;">- 이름: ${c.name} (${c.birthdate || ''})</div>
                     <div style="font-size: 0.76rem; color: var(--text-muted); margin-left: 8px; text-align: left;">아이디: <strong>${c.username || '-'}</strong> / 비번: <strong>${c.password || '-'}</strong></div>`
                ).join('<div style="height: 6px;"></div>');
                
                const dateStr = u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-';
                let dateLabel = `신청일: ${dateStr}`;
                if (filterStatus === 'approved') {
                    const appDate = u.approvedAt ? new Date(u.approvedAt).toLocaleDateString() : '-';
                    dateLabel = `신청일: ${dateStr}<br><span style="color: var(--success-color); font-weight: 600;">승인일: ${appDate}</span>`;
                } else if (filterStatus === 'terminated') {
                    const appDate = u.approvedAt ? new Date(u.approvedAt).toLocaleDateString() : '-';
                    const termDate = u.terminatedAt ? new Date(u.terminatedAt).toLocaleDateString() : '-';
                    dateLabel = `승인일: ${appDate}<br><span style="color: #ff4d4f; font-weight: 600;">종결일: ${termDate}</span>`;
                }
                
                let actionBtn = '';
                if (filterStatus === 'pending') {
                    actionBtn = `<button type="button" class="btn-approve" data-id="${u.id}" style="padding: 6px 14px; font-size: 0.8rem; background: var(--success-color); border: none; color: white; border-radius: 6px; cursor: pointer; font-weight: 700;">승인</button>`;
                } else if (filterStatus === 'approved') {
                    actionBtn = `<label style="display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 0.82rem; cursor: pointer; font-weight: 700; color: #ff4d4f;">
                                    <input type="checkbox" class="chk-terminate" data-id="${u.id}" style="accent-color: #ff4d4f;"> 종결
                                 </label>`;
                } else if (filterStatus === 'terminated') {
                    actionBtn = `<button type="button" class="btn-terminate-cancel" data-id="${u.id}" style="padding: 6px 12px; font-size: 0.78rem; background: #f1f5f9; border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 6px; cursor: pointer; font-weight: 600;">종결 취소</button>`;
                }
                
                tr.innerHTML = `
                    <td style="padding: 12px; font-size: 0.85rem; line-height: 1.4; text-align: left;">
                        <div style="font-weight: 700; color: var(--text-primary);">${u.name} (${u.email})</div>
                        <div style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 4px;">연락처: ${u.phone || u.user_metadata?.phone || '-'}</div>
                        <div style="font-size: 0.78rem; color: var(--text-secondary);">주소: ${(u.address || u.user_metadata?.address || '-').replace(' | ', ' ')}</div>
                    </td>
                    <td style="padding: 12px; text-align: left;">
                        ${childrenText}
                    </td>
                    <td style="padding: 12px; text-align: center; font-size: 0.8rem; line-height: 1.4; color: var(--text-secondary);">
                        ${dateLabel}
                    </td>
                    <td style="padding: 12px; text-align: center;">
                        ${actionBtn}
                    </td>
                `;
                
                // Bind actions
                if (filterStatus === 'pending') {
                    tr.querySelector('.btn-approve').addEventListener('click', () => {
                        if (confirm(`"${u.name}" 학부모 계정을 가입 승인하시겠습니까?\n승인 시 자녀 계정들도 활성화되며 원생 명단에 추가됩니다.`)) {
                            u.status = 'approved';
                            u.approvedAt = new Date().toISOString();
                            
                            const childrenData = u.user_metadata?.children || [];
                            childrenData.forEach((c, idx) => {
                                let exist = students.find(s => s.name === c.name && (s.parentPhone === u.phone || s.phone === c.phone));
                                let age = 10;
                                if (c.birthdate) {
                                    const birthYear = new Date(c.birthdate).getFullYear();
                                    age = new Date().getFullYear() - birthYear + 1;
                                }
                                if (!exist) {
                                    students.unshift({
                                        id: `${u.id}-${idx}`,
                                        name: c.name,
                                        age,
                                        school: '공부방 초등학교',
                                        phone: c.phone || '',
                                        parentPhone: u.phone,
                                        sibling: childrenData.length > 1 ? `${childrenData.length - 1}명의 형제자매` : '없음',
                                        schedule: { mon: '', tue: '', wed: '', thu: '', fri: '' },
                                        progress: '개념 완성 과정 등록 대기 중',
                                        remarks: '신규 가입 자녀입니다. 스케줄을 설정해 주세요.',
                                        username: c.username,
                                        password: c.password,
                                        address: u.address
                                    });
                                } else {
                                    exist.username = c.username;
                                    exist.password = c.password;
                                    exist.address = u.address;
                                    exist.id = `${u.id}-${idx}`;
                                }
                            });
                            
                            localStorage.setItem('gongbubang_mock_users', JSON.stringify(mockUsers));
                            saveStudents();
                            renderApprovalList();
                            renderStudents();
                            showToast(`"${u.name}" 학부모 가입이 승인되었습니다.`);
                        }
                    });
                } else if (filterStatus === 'approved') {
                    tr.querySelector('.chk-terminate').addEventListener('change', (e) => {
                        if (e.target.checked) {
                            if (confirm(`"${u.name}" 학부모 및 등록된 자녀 계정을 종결(퇴원) 처리하시겠습니까?\n종결 처리 시 해당 계정의 로그인이 즉시 차단됩니다.`)) {
                                u.status = 'terminated';
                                u.terminatedAt = new Date().toISOString();
                                
                                const childIds = (u.user_metadata?.children || []).map((_, idx) => `${u.id}-${idx}`);
                                students = students.map(s => {
                                    if (childIds.includes(String(s.id))) {
                                        return {
                                            ...s,
                                            isTerminated: true,
                                            terminationDate: new Date().toISOString().split('T')[0]
                                        };
                                    }
                                    return s;
                                });
                                
                                localStorage.setItem('gongbubang_mock_users', JSON.stringify(mockUsers));
                                saveStudents();
                                renderApprovalList();
                                renderStudents();
                                showToast(`"${u.name}" 학부모 계정이 종결되었습니다.`);
                            } else {
                                e.target.checked = false;
                            }
                        }
                    });
                } else if (filterStatus === 'terminated') {
                    tr.querySelector('.btn-terminate-cancel').addEventListener('click', () => {
                        if (confirm(`"${u.name}" 학부모 계정의 종결 처리를 취소하고 다시 승인 상태로 복원하시겠습니까?`)) {
                            u.status = 'approved';
                            u.terminatedAt = null;
                            
                            const childIds = (u.user_metadata?.children || []).map((_, idx) => `${u.id}-${idx}`);
                            students = students.map(s => {
                                if (childIds.includes(String(s.id))) {
                                    return {
                                        ...s,
                                        isTerminated: false,
                                        terminationDate: ''
                                    };
                                }
                                return s;
                            });
                            
                            localStorage.setItem('gongbubang_mock_users', JSON.stringify(mockUsers));
                            saveStudents();
                            renderApprovalList();
                            renderStudents();
                            showToast(`"${u.name}" 학부모 계정이 승인 상태로 복원되었습니다.`);
                        }
                    });
                }
                
                tbody.appendChild(tr);
            });
            safeCreateIcons();
        };

        // User Profile update modal logic
        const linkUserProfileEdit = document.getElementById('link-user-profile-edit');
        const userProfileModal = document.getElementById('user-profile-modal');
        const btnUserProfileClose = document.getElementById('btn-user-profile-close');
        const userProfileForm = document.getElementById('user-profile-form');
        
        if (linkUserProfileEdit && userProfileModal) {
            linkUserProfileEdit.addEventListener('click', (e) => {
                e.preventDefault();
                
                const emailDisplay = document.getElementById('profile-email-display');
                const phoneInput = document.getElementById('profile-phone-input');
                const phoneGroup = document.getElementById('profile-phone-group');
                const passwordInput = document.getElementById('profile-password-input');
                
                if (passwordInput) passwordInput.value = '';
                
                if (isAdmin) {
                    if (emailDisplay) emailDisplay.value = 'teacher@math.com (관리자)';
                    if (phoneGroup) phoneGroup.style.display = 'none';
                } else if (isStudent) {
                    if (phoneGroup) phoneGroup.style.display = 'block';
                    
                    const studentSession = JSON.parse(localStorage.getItem('gongbubang_student_session') || 'null');
                    if (studentSession) {
                        if (emailDisplay) emailDisplay.value = studentSession.username + ' (학생)';
                        const s = students.find(x => x.id === loggedInStudentId);
                        if (s && phoneInput) phoneInput.value = s.phone || '';
                    } else {
                        const user = supabase.auth.user ? supabase.auth.user() : null;
                        if (user) {
                            if (emailDisplay) emailDisplay.value = user.email + ' (학부모)';
                            if (phoneInput) phoneInput.value = user.user_metadata?.phone || '';
                        }
                    }
                }
                userProfileModal.classList.add('open');
            });
        }
        
        if (btnUserProfileClose && userProfileModal) {
            btnUserProfileClose.addEventListener('click', () => {
                userProfileModal.classList.remove('open');
            });
        }
        
        if (userProfileForm) {
            userProfileForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const newPhone = document.getElementById('profile-phone-input').value.trim();
                const newPassword = document.getElementById('profile-password-input').value;
                
                try {
                    if (isAdmin) {
                        if (newPassword) {
                            if (newPassword.length < 4) {
                                alert('비밀번호는 4자리 이상이어야 합니다.');
                                return;
                            }
                            localStorage.setItem('gongbubang_admin_password', newPassword);
                            showToast('관리자 비밀번호가 성공적으로 변경되었습니다.');
                        }
                    } else if (isStudent) {
                        const studentSession = JSON.parse(localStorage.getItem('gongbubang_student_session') || 'null');
                        if (studentSession) {
                            // Student password change
                            const s = students.find(x => x.id === loggedInStudentId);
                            if (s) {
                                s.phone = newPhone;
                                if (newPassword) {
                                    if (newPassword.length < 4) {
                                        alert('비밀번호는 4자리 이상이어야 합니다.');
                                        return;
                                    }
                                    s.password = newPassword;
                                }
                                saveStudents();
                            }
                            
                            // Sync back to gongbubang_mock_users
                            let mockUsers = JSON.parse(localStorage.getItem('gongbubang_mock_users') || '[]');
                            let parentId = null;
                            if (String(loggedInStudentId).includes('-')) {
                                parentId = String(loggedInStudentId).split('-')[0];
                            }
                            if (parentId) {
                                mockUsers = mockUsers.map(u => {
                                    if (u.id === parentId) {
                                        const updatedChildren = (u.user_metadata?.children || []).map(child => {
                                            if (child.name === studentSession.name) {
                                                let uc = { ...child, phone: newPhone };
                                                if (newPassword) uc.password = newPassword;
                                                return uc;
                                            }
                                            return child;
                                        });
                                        return {
                                            ...u,
                                            user_metadata: {
                                                ...u.user_metadata,
                                                children: updatedChildren
                                            }
                                        };
                                    }
                                    return u;
                                });
                                localStorage.setItem('gongbubang_mock_users', JSON.stringify(mockUsers));
                            }
                            showToast('학생 정보가 수정되었습니다.');
                        } else {
                            // Parent password change
                            const user = supabase.auth.user ? supabase.auth.user() : null;
                            if (user) {
                                let mockUsers = JSON.parse(localStorage.getItem('gongbubang_mock_users') || '[]');
                                mockUsers = mockUsers.map(u => {
                                    if (u.id === user.id || u.email === user.email) {
                                        let uu = { ...u, phone: newPhone };
                                        if (newPassword) uu.password = newPassword;
                                        uu.user_metadata = {
                                            ...u.user_metadata,
                                            phone: newPhone
                                        };
                                        return uu;
                                    }
                                    return u;
                                });
                                localStorage.setItem('gongbubang_mock_users', JSON.stringify(mockUsers));
                                
                                if (supabase.auth.updateUser) {
                                    const updateData = { data: { phone: newPhone } };
                                    if (newPassword) updateData.password = newPassword;
                                    await supabase.auth.updateUser(updateData);
                                }
                                
                                students = students.map(s => {
                                    if (String(s.id).startsWith(user.id)) {
                                        return { ...s, parentPhone: newPhone };
                                    }
                                    return s;
                                });
                                saveStudents();
                                showToast('개인정보가 수정되었습니다.');
                            }
                        }
                    }
                    
                    if (userProfileModal) userProfileModal.classList.remove('open');
                    updateLoginButton();
                    renderStudents();
                    renderMyClass();
                } catch(err) {
                    console.error('Profile update error:', err);
                    alert('정보 수정 중 오류가 발생했습니다: ' + err.message);
                }
            });
        }

        // Bind approval status change
        const approvalStatusFilter = document.getElementById('approval-status-filter');
        const approvalYearFilter = document.getElementById('approval-year-filter');
        if (approvalStatusFilter) approvalStatusFilter.addEventListener('change', renderApprovalList);
        if (approvalYearFilter) approvalYearFilter.addEventListener('change', renderApprovalList);

        // Bind resource CRUD form
        const resourceForm = document.getElementById('resource-editor-form');
        if (resourceForm) {
            resourceForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const id = document.getElementById('edit-resource-id').value;
                const title = document.getElementById('resource-title-input').value.trim();
                const size = document.getElementById('resource-size-input').value.trim();
                const target = document.getElementById('resource-target-input').value.trim();
                const type = document.getElementById('resource-type-select').value;
                const filename = document.getElementById('resource-filename-input').value.trim();
                
                let resources = [];
                try {
                    resources = JSON.parse(localStorage.getItem('gongbubang_resources') || '[]');
                } catch(err){}
                
                if (id) {
                    resources = resources.map(res => res.id === id ? { ...res, title, size, target, type, filename } : res);
                    showToast('자료가 수정되었습니다.');
                } else {
                    const newRes = {
                        id: 'res-' + Date.now(),
                        title,
                        size,
                        target,
                        type,
                        filename,
                        downloads: 0
                    };
                    resources.push(newRes);
                    showToast('자료가 새로 등록되었습니다.');
                }
                
                localStorage.setItem('gongbubang_resources', JSON.stringify(resources));
                resourceForm.reset();
                document.getElementById('edit-resource-id').value = '';
                document.getElementById('resource-editor-title').innerHTML = `<i data-lucide="plus-circle" style="width: 18px; height: 18px;"></i> 자료 등록 / 수정`;
                renderResources();
                renderAdminResources();
            });
        }
        
        const btnResourceClear = document.getElementById('btn-resource-clear');
        if (btnResourceClear && resourceForm) {
            btnResourceClear.addEventListener('click', () => {
                resourceForm.reset();
                document.getElementById('edit-resource-id').value = '';
                document.getElementById('resource-editor-title').innerHTML = `<i data-lucide="plus-circle" style="width: 18px; height: 18px;"></i> 자료 등록 / 수정`;
                safeCreateIcons();
            });
        }

        // Daum Postcode Search integration
        const openPostcode = (inputElement) => {
            if (typeof daum === 'undefined') {
                alert('주소 검색 서비스를 불러올 수 없습니다. 인터넷 연결을 확인해 주세요.');
                return;
            }
            
            let containerId = '';
            let embedId = '';
            let closeBtnId = '';
            
            if (inputElement.id === 'student-signup-address') {
                containerId = 'signup-address-search-container';
                embedId = 'signup-postcode-embed';
                closeBtnId = 'btn-close-signup-postcode';
            } else {
                containerId = 'admin-address-search-container';
                embedId = 'admin-postcode-embed';
                closeBtnId = 'btn-close-admin-postcode';
            }
            
            const container = document.getElementById(containerId);
            const embedDiv = document.getElementById(embedId);
            const closeBtn = document.getElementById(closeBtnId);
            
            if (!container || !embedDiv) return;
            
            // Close other postcode container if open
            const otherContainerId = (containerId === 'signup-address-search-container') ? 'admin-address-search-container' : 'signup-address-search-container';
            const otherContainer = document.getElementById(otherContainerId);
            if (otherContainer) otherContainer.style.display = 'none';
            
            container.style.display = 'block';
            
            new daum.Postcode({
                oncomplete: function(data) {
                    let addr = '';
                    let extraAddr = '';

                    if (data.userSelectedType === 'R') {
                        addr = data.roadAddress;
                    } else {
                        addr = data.jibunAddress;
                    }

                    if (data.userSelectedType === 'R') {
                        if (data.bname !== '' && /[동|로|가]$/g.test(data.bname)) {
                            extraAddr += data.bname;
                        }
                        if (data.buildingName !== '' && data.apartment === 'Y') {
                            extraAddr += (extraAddr !== '' ? ', ' + data.buildingName : data.buildingName);
                        }
                        if (extraAddr !== '') {
                            extraAddr = ' (' + extraAddr + ')';
                        }
                    }

                    inputElement.value = addr + extraAddr;
                    inputElement.dispatchEvent(new Event('input', { bubbles: true }));
                    container.style.display = 'none';
                    
                    // Autofocus detailed address field
                    const detailInputId = (inputElement.id === 'student-signup-address') ? 'student-signup-address-detail' : 'student-address-detail-input';
                    const detailInput = document.getElementById(detailInputId);
                    if (detailInput) {
                        detailInput.focus();
                    }
                },
                width: '100%',
                height: '100%'
            }).embed(embedDiv);
            
            if (closeBtn) {
                closeBtn.onclick = () => {
                    container.style.display = 'none';
                };
            }
        };

        const btnSignupSearchAddress = document.getElementById('btn-signup-search-address');
        const inputSignupAddress = document.getElementById('student-signup-address');
        if (btnSignupSearchAddress && inputSignupAddress) {
            const handler = () => openPostcode(inputSignupAddress);
            btnSignupSearchAddress.addEventListener('click', handler);
            inputSignupAddress.addEventListener('click', handler);
        }

        const btnAdminSearchAddress = document.getElementById('btn-admin-search-address');
        const inputAdminAddress = document.getElementById('student-address-input');
        if (btnAdminSearchAddress && inputAdminAddress) {
            const handler = () => openPostcode(inputAdminAddress);
            btnAdminSearchAddress.addEventListener('click', handler);
            inputAdminAddress.addEventListener('click', handler);
        }

        // Initial Renders
        renderCurriculumGrid();

        safeCreateIcons();
        renderNotices();
        
        // Initialize user database and sync students
        initUsers();
        
        if (isAdmin) {
            renderStudents();
            renderConsultList();
            renderAdminCurriculumList();
            renderAiQueryManagement();
            renderApprovalList();
            renderAdminResources();
        }
});
