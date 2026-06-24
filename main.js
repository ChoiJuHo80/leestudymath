import { supabase, isMock } from './supabase.js';

document.addEventListener('DOMContentLoaded', () => {
    // Helper to safely re-render Lucide icons
    const safeCreateIcons = () => {
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        } else {
            console.warn('Lucide is not loaded yet.');
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
    const easyLoginForm = document.getElementById('student-login-form');
    const emailLoginForm = document.getElementById('student-email-login-form');

    if (btnTabEasy && btnTabEmail && easyLoginForm && emailLoginForm) {
        btnTabEasy.addEventListener('click', () => {
            btnTabEasy.classList.add('active');
            btnTabEmail.classList.remove('active');
            easyLoginForm.style.display = 'block';
            emailLoginForm.style.display = 'none';
        });

        btnTabEmail.addEventListener('click', () => {
            btnTabEmail.classList.add('active');
            btnTabEasy.classList.remove('active');
            emailLoginForm.style.display = 'block';
            easyLoginForm.style.display = 'none';
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
        'student-signup-phone'
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
                <div class="form-group-modal" style="margin-bottom: 0;">
                    <label style="font-size: 0.8rem; margin-bottom: 4px; font-weight: 700;">이름</label>
                    <input type="text" class="child-name-input" required placeholder="예: 김민준" style="padding: 8px 12px; font-size: 0.85rem;">
                </div>
                <div class="form-group-modal" style="margin-bottom: 0;">
                    <label style="font-size: 0.8rem; margin-bottom: 4px; font-weight: 700;">생년월일</label>
                    <input type="date" class="child-birth-input" required style="padding: 7px 12px; font-size: 0.85rem;">
                </div>
                <div class="form-group-modal" style="margin-bottom: 0;">
                    <label style="font-size: 0.8rem; margin-bottom: 4px; font-weight: 700;">연락처 (선택)</label>
                    <input type="text" class="child-phone-input" placeholder="010-0000-0000" style="padding: 8px 12px; font-size: 0.85rem;">
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

        // Attach phone input formatter dynamically to child phone fields
        const childPhoneInput = block.querySelector('.child-phone-input');
        if (childPhoneInput) {
            childPhoneInput.addEventListener('input', handlePhoneInput);
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
            
            // Clear and add first child
            if (signupChildrenContainer) {
                signupChildrenContainer.innerHTML = '';
                childIndex = 0;
                createChildInputBlock();
            }

            studentSignupModal.classList.add('open');
            const signupEmailInput = document.getElementById('student-signup-email');
            if (signupEmailInput) signupEmailInput.focus();
        });
    }

    if (btnStudentSignupClose && studentSignupModal) {
        btnStudentSignupClose.addEventListener('click', () => {
            studentSignupModal.classList.remove('open');
        });
    }

    if (studentSignupModal) {
        studentSignupModal.addEventListener('click', (e) => {
            if (e.target === studentSignupModal) {
                studentSignupModal.classList.remove('open');
            }
        });
    }

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
    const downloadBtns = document.querySelectorAll('.btn-download');
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

    downloadBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const filename = btn.getAttribute('data-filename');
            const originalHTML = btn.innerHTML;

            if (btn.classList.contains('downloading')) return;

            btn.classList.add('downloading');
            btn.innerHTML = `
                <i data-lucide="loader-2" class="animate-spin"></i>
                <span>다운로드 중...</span>
            `;
            safeCreateIcons();

            setTimeout(() => {
                btn.classList.remove('downloading');
                btn.innerHTML = originalHTML;
                safeCreateIcons();
                showToast(`"${filename}" 다운로드가 완료되었습니다.`);
            }, 1800);
        });
    });

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

    const renderMainScheduleTable = () => {
        const tbody = document.getElementById('main-schedule-tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        
        if (!Array.isArray(classes) || classes.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="padding: 24px; color: var(--text-secondary);">등록된 수업 스케줄이 없습니다.</td></tr>`;
            return;
        }
        
        classes.forEach(c => {
            const tr = document.createElement('tr');
            
            // Format days
            const monText = c.schedule?.mon || '-';
            const tueText = c.schedule?.tue || '-';
            const wedText = c.schedule?.wed || '-';
            const thuText = c.schedule?.thu || '-';
            const friText = c.schedule?.fri || '-';
            
            tr.innerHTML = `
                <td class="time-slot" style="font-weight: 600; text-align: left; padding-left: 20px;">${c.name}</td>
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
    const btnAdminToggle = document.getElementById('btn-admin-toggle');
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

        // Dynamic sorting: Pinned notices go first, then sorted by ID descending
        notices.sort((a, b) => {
            const aPinned = a.pinned ? 1 : 0;
            const bPinned = b.pinned ? 1 : 0;
            if (aPinned !== bPinned) {
                return bPinned - aPinned;
            }
            return b.id - a.id;
        });

        noticeListContainer.innerHTML = '';
        
        if (notices.length === 0) {
            noticeListContainer.innerHTML = `
                <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
                    등록된 공지사항이 없습니다.
                </div>
            `;
            return;
        }

        notices.forEach(notice => {
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
    const studentFormModalTitle = document.getElementById('student-form-modal-title');

    const updateTotalStudentsCount = () => {
        const countEl = document.getElementById('total-students-count');
        if (countEl) {
            countEl.textContent = `${students.length}명`;
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
            const matchesClass = !classFilterVal || String(s.classId) === String(classFilterVal);
            return matchesSearch && matchesClass;
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

            card.innerHTML = `
                <div class="student-card-header">
                    <div class="student-info-title">
                        <h3>${student.name}</h3>
                        <span>${student.age}세 &middot; ${student.school}</span>
                        ${classNameTag}
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
                    <h4><i data-lucide="file-edit" style="width: 14px; height: 14px; color: var(--text-secondary);"></i>특이사항 및 피드백</h4>
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

            if (editId) {
                // Update
                const id = parseStudentId(editId);
                students = students.map(student => {
                    if (student.id === id) {
                        return {
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
                            remarks
                        };
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
                    remarks
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

    // ==========================================================================
    // Admin Toggle & Authentication Actions
    // ==========================================================================
    if (btnAdminToggle && adminAuthModal && adminPasswordInput && authErrorMsg && btnAdminWrite) {
        btnAdminToggle.addEventListener('click', async () => {
            if (isAdmin) {
                // Logout
                try {
                    await supabase.auth.signOut();
                } catch(e) {
                    console.error('Signout error:', e);
                }
                isAdmin = false;
                btnAdminToggle.classList.remove('active-admin');
                btnAdminToggle.querySelector('span').textContent = '관리자 로그인';
                const iconWrapper = btnAdminToggle.querySelector('.admin-icon-wrapper');
                if (iconWrapper) {
                    iconWrapper.innerHTML = '<i data-lucide="lock"></i>';
                }
                btnAdminWrite.style.display = 'none';
                
                // Hide private student layout and links
                if (studentSection) studentSection.style.display = 'none';
                if (navLinkStudents) navLinkStudents.style.display = 'none';
                if (drawerLinkStudents) drawerLinkStudents.style.display = 'none';
                
                renderNotices();
                showToast('관리자 모드가 해제되었습니다.');
            } else {
                // Open login modal
                adminPasswordInput.value = '';
                authErrorMsg.style.display = 'none';
                adminAuthModal.classList.add('open');
                adminPasswordInput.focus();
            }
            safeCreateIcons();
        });

        if (btnAuthClose) {
            btnAuthClose.addEventListener('click', () => {
                adminAuthModal.classList.remove('open');
            });
        }

        adminAuthModal.addEventListener('click', (e) => {
            if (e.target === adminAuthModal) {
                adminAuthModal.classList.remove('open');
            }
        });

        // Password verification form submit
        if (adminAuthForm) {
            adminAuthForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const password = adminPasswordInput.value.trim();

                if (password === '9999') {
                    isAdmin = true;
                    adminAuthModal.classList.remove('open');
                    btnAdminToggle.classList.add('active-admin');
                    btnAdminToggle.querySelector('span').textContent = '관리자 로그아웃';
                    const iconWrapper = btnAdminToggle.querySelector('.admin-icon-wrapper');
                    if (iconWrapper) {
                        iconWrapper.innerHTML = '<i data-lucide="unlock"></i>';
                    }
                    btnAdminWrite.style.display = 'inline-flex';
                    
                    // Show private student layout and links
                    if (studentSection) studentSection.style.display = 'block';
                    if (navLinkStudents) navLinkStudents.style.display = 'inline-block';
                    if (drawerLinkStudents) drawerLinkStudents.style.display = 'block';
                    
                    renderNotices();
                    renderStudents();
                    renderConsultList();
                    renderAdminCurriculumList();
                    showToast('관리자 모드가 성공적으로 활성화되었습니다.');
                } else {
                    authErrorMsg.style.display = 'block';
                    const authBox = adminAuthModal.querySelector('.modal-box');
                    if (authBox) {
                        authBox.classList.add('shake');
                        adminPasswordInput.value = '';
                        adminPasswordInput.focus();

                        setTimeout(() => {
                            authBox.classList.remove('shake');
                        }, 400);
                    }
                }
                safeCreateIcons();
            });
        }
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
    const btnStudentLoginToggle = document.getElementById('btn-student-login-toggle');
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
                    <div style="margin-top: 6px; border-bottom: 1px dashed var(--border-color); padding-bottom: 6px;">
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
                    
                    <div style="margin-top: 6px; border-top: 1px dashed var(--border-color); padding-top: 10px;">
                        <strong style="color: var(--text-primary); display: block; margin-bottom: 6px;">선생님 지도 피드백 기록:</strong>
                        <div style="max-height: 120px; overflow-y: auto; padding-right: 4px;">
                            ${feedbacksHtml}
                        </div>
                    </div>
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

        renderStudentChat();
        safeCreateIcons();
    };

    // Toggle Student/Parent Login Modal
    if (btnStudentLoginToggle && studentLoginModal && studentLoginForm && studentLoginNameInput && studentLoginPhoneInput && studentAuthErrorMsg) {
        btnStudentLoginToggle.addEventListener('click', async () => {
            if (isStudent) {
                // Logout
                try {
                    await supabase.auth.signOut();
                } catch(e) {
                    console.error('Signout error:', e);
                }

                isStudent = false;
                loggedInStudentId = null;
                btnStudentLoginToggle.classList.remove('active-admin');
                btnStudentLoginToggle.querySelector('span').textContent = '학생/학부모 로그인';
                
                if (myclassSection) myclassSection.style.display = 'none';
                if (navLinkMyclass) navLinkMyclass.style.display = 'none';
                if (drawerLinkMyclass) drawerLinkMyclass.style.display = 'none';
                
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

                // Reset tab to easy login as default
                if (btnTabEasy && btnTabEmail && easyLoginForm && emailLoginForm) {
                    btnTabEasy.classList.add('active');
                    btnTabEmail.classList.remove('active');
                    easyLoginForm.style.display = 'block';
                    emailLoginForm.style.display = 'none';
                }

                studentLoginModal.classList.add('open');
                studentLoginNameInput.focus();
            }
        });

        if (btnStudentLoginClose) {
            btnStudentLoginClose.addEventListener('click', () => {
                studentLoginModal.classList.remove('open');
            });
        }

        studentLoginModal.addEventListener('click', (e) => {
            if (e.target === studentLoginModal) {
                studentLoginModal.classList.remove('open');
            }
        });

        // Submit Student Login Form (Easy Login via name/phone)
        studentLoginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const inputName = studentLoginNameInput.value.trim();
            const inputPhone = studentLoginPhoneInput.value.trim();

            const foundStudent = students.find(s => 
                s.name === inputName && 
                (s.parentPhone === inputPhone || (s.phone && s.phone === inputPhone))
            );

            if (foundStudent) {
                // Logged in successfully
                localStorage.setItem('gongbubang_last_student_name', inputName);
                isStudent = true;
                loggedInStudentId = foundStudent.id;
                
                // Hide admin/teacher panels to avoid clash
                if (isAdmin) {
                    isAdmin = false;
                    if (btnAdminToggle) {
                        btnAdminToggle.classList.remove('active-admin');
                        btnAdminToggle.querySelector('span').textContent = '관리자 로그인';
                        const adminIcon = btnAdminToggle.querySelector('.admin-icon-wrapper');
                        if (adminIcon) adminIcon.innerHTML = '<i data-lucide="lock"></i>';
                    }
                    if (btnAdminWrite) btnAdminWrite.style.display = 'none';
                    if (studentSection) studentSection.style.display = 'none';
                    if (navLinkStudents) navLinkStudents.style.display = 'none';
                    if (drawerLinkStudents) drawerLinkStudents.style.display = 'none';
                }

                studentLoginModal.classList.remove('open');
                btnStudentLoginToggle.classList.add('active-admin');
                btnStudentLoginToggle.querySelector('span').textContent = '마이클래스 로그아웃';

                if (myclassSection) myclassSection.style.display = 'block';
                if (navLinkMyclass) navLinkMyclass.style.display = 'inline-block';
                if (drawerLinkMyclass) drawerLinkMyclass.style.display = 'block';

                renderMyClass();
                showToast(`[로그인 성공] ${foundStudent.name} 학생/학부모 포털에 연결되었습니다.`);

                // Smooth scroll to myclass
                setTimeout(() => {
                    const targetOffset = myclassSection.offsetTop - 90;
                    window.scrollTo({ top: targetOffset, behavior: 'smooth' });
                }, 100);
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
                        isAdmin = true;
                        studentLoginModal.classList.remove('open');
                        
                        if (btnAdminToggle) {
                            btnAdminToggle.classList.add('active-admin');
                            btnAdminToggle.querySelector('span').textContent = '관리자 로그아웃';
                            const adminIcon = btnAdminToggle.querySelector('.admin-icon-wrapper');
                            if (adminIcon) adminIcon.innerHTML = '<i data-lucide="unlock"></i>';
                        }
                        if (btnAdminWrite) btnAdminWrite.style.display = 'inline-flex';
                        if (studentSection) studentSection.style.display = 'block';
                        if (navLinkStudents) navLinkStudents.style.display = 'inline-block';
                        if (drawerLinkStudents) drawerLinkStudents.style.display = 'block';
                        
                        renderNotices();
                        renderStudents();
                        showToast('관리자 모드가 활성화되었습니다.');
                        return;
                    }

                    const { data, error } = await supabase.auth.signInWithPassword({
                        email,
                        password
                    });

                    if (error) {
                        throw error;
                    }

                    if (data.user) {
                        localStorage.setItem('gongbubang_last_student_email', email);
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
                                remarks: 'Supabase로 가입된 계정입니다. 스케줄을 추가해 주세요.'
                            };
                            students.unshift(studentRecord);
                            saveStudents();
                        } else if (studentRecord.id !== data.user.id) {
                            // Sync ID
                            students = students.map(s => s.id === studentRecord.id ? { ...s, id: data.user.id } : s);
                            saveStudents();
                        }

                        // Success login state
                        isStudent = true;
                        loggedInStudentId = data.user.id;

                        // Hide admin/teacher panels to avoid clash
                        if (isAdmin) {
                            isAdmin = false;
                            if (btnAdminToggle) {
                                btnAdminToggle.classList.remove('active-admin');
                                btnAdminToggle.querySelector('span').textContent = '관리자 로그인';
                                const adminIcon = btnAdminToggle.querySelector('.admin-icon-wrapper');
                                if (adminIcon) adminIcon.innerHTML = '<i data-lucide="lock"></i>';
                            }
                            if (btnAdminWrite) btnAdminWrite.style.display = 'none';
                            if (studentSection) studentSection.style.display = 'none';
                            if (navLinkStudents) navLinkStudents.style.display = 'none';
                            if (drawerLinkStudents) drawerLinkStudents.style.display = 'none';
                        }

                        studentLoginModal.classList.remove('open');
                        btnStudentLoginToggle.classList.add('active-admin');
                        btnStudentLoginToggle.querySelector('span').textContent = '마이클래스 로그아웃';

                        if (myclassSection) myclassSection.style.display = 'block';
                        if (navLinkMyclass) navLinkMyclass.style.display = 'inline-block';
                        if (drawerLinkMyclass) drawerLinkMyclass.style.display = 'block';

                        renderMyClass();
                        showToast(`[로그인 성공] ${name} 학생/학부모 포털에 연결되었습니다.`);

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

        // Submit Signup Form (Supabase Auth)
        const studentSignupForm = document.getElementById('student-signup-form');
        const signupErrorMsg = document.getElementById('signup-error-msg');

        if (studentSignupForm) {
            studentSignupForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('student-signup-email').value.trim();
                const password = document.getElementById('student-signup-password').value;
                const phone = document.getElementById('student-signup-phone').value.trim();

                // Collect children info dynamically
                const children = [];
                const childBlocks = signupChildrenContainer.querySelectorAll('.signup-child-block');
                childBlocks.forEach(block => {
                    const name = block.querySelector('.child-name-input').value.trim();
                    const birthdate = block.querySelector('.child-birth-input').value;
                    const childPhone = block.querySelector('.child-phone-input').value.trim();
                    children.push({ name, birthdate, phone: childPhone });
                });

                if (children.length === 0) {
                    if (signupErrorMsg) {
                        signupErrorMsg.textContent = '최소 한 명 이상의 자녀를 등록해 주세요.';
                        signupErrorMsg.style.display = 'block';
                    }
                    return;
                }

                const submitBtn = studentSignupForm.querySelector('.btn-modal-submit');
                const originalText = submitBtn.textContent;
                submitBtn.disabled = true;
                submitBtn.textContent = '가입 중...';
                if (signupErrorMsg) signupErrorMsg.style.display = 'none';

                try {
                    const { data, error } = await supabase.auth.signUp({
                        email,
                        password,
                        options: {
                            data: {
                                name: children[0].name,
                                phone,
                                children,
                                role: 'parent'
                            }
                        }
                    });

                    if (error) {
                        throw error;
                    }

                    if (data.user) {
                        showToast('회원가입이 완료되었습니다! 자동으로 로그인됩니다.');
                        studentSignupModal.classList.remove('open');
                        
                        // Map or create student records in LMS
                        children.forEach((child, idx) => {
                            let studentRecord = students.find(s => s.name === child.name && (s.parentPhone === phone || s.phone === child.phone));
                            if (!studentRecord) {
                                let age = 10;
                                if (child.birthdate) {
                                    const birthYear = new Date(child.birthdate).getFullYear();
                                    age = new Date().getFullYear() - birthYear + 1;
                                }
                                studentRecord = {
                                    id: `${data.user.id}-${idx}`,
                                    name: child.name,
                                    age,
                                    school: '공부방 초등학교',
                                    phone: child.phone,
                                    parentPhone: phone,
                                    sibling: children.length > 1 ? `${children.length - 1}명의 형제자매` : '없음',
                                    schedule: { mon: '', tue: '', wed: '', thu: '', fri: '' },
                                    progress: '개념 완성 과정 등록 대기 중',
                                    remarks: 'Supabase 가입 신규 학부모 계정입니다. 스케줄을 설정해 주세요.'
                                };
                                students.unshift(studentRecord);
                            } else {
                                students = students.map(s => s.id === studentRecord.id ? { 
                                    ...s, 
                                    id: `${data.user.id}-${idx}`, 
                                    sibling: children.length > 1 ? `${children.length - 1}명의 형제자매` : s.sibling 
                                } : s);
                            }
                        });
                        saveStudents();

                        isStudent = true;
                        loggedInStudentId = `${data.user.id}-0`; // Default to first child

                        // Hide admin/teacher panels to avoid clash
                        if (isAdmin) {
                            isAdmin = false;
                            if (btnAdminToggle) {
                                btnAdminToggle.classList.remove('active-admin');
                                btnAdminToggle.querySelector('span').textContent = '관리자 로그인';
                                const adminIcon = btnAdminToggle.querySelector('.admin-icon-wrapper');
                                if (adminIcon) adminIcon.innerHTML = '<i data-lucide="lock"></i>';
                            }
                            if (btnAdminWrite) btnAdminWrite.style.display = 'none';
                            if (studentSection) studentSection.style.display = 'none';
                            if (navLinkStudents) navLinkStudents.style.display = 'none';
                            if (drawerLinkStudents) drawerLinkStudents.style.display = 'none';
                        }

                        btnStudentLoginToggle.classList.add('active-admin');
                        btnStudentLoginToggle.querySelector('span').textContent = '마이클래스 로그아웃';

                        if (myclassSection) myclassSection.style.display = 'block';
                        if (navLinkMyclass) navLinkMyclass.style.display = 'inline-block';
                        if (drawerLinkMyclass) drawerLinkMyclass.style.display = 'block';

                        renderMyClass();
                        
                        setTimeout(() => {
                            const targetOffset = myclassSection.offsetTop - 90;
                            window.scrollTo({ top: targetOffset, behavior: 'smooth' });
                        }, 200);
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

    // Initial load & Auth Listener Setup
    supabase.auth.onAuthStateChange((event, session) => {
        if (session && session.user) {
            // Check if they are admin
            if (session.user.email === 'teacher@math.com') {
                isAdmin = true;
                isStudent = false;
                loggedInStudentId = null;
                
                if (btnAdminToggle) {
                    btnAdminToggle.classList.add('active-admin');
                    btnAdminToggle.querySelector('span').textContent = '관리자 로그아웃';
                    const adminIcon = btnAdminToggle.querySelector('.admin-icon-wrapper');
                    if (adminIcon) adminIcon.innerHTML = '<i data-lucide="unlock"></i>';
                }
                if (btnAdminWrite) btnAdminWrite.style.display = 'inline-flex';
                if (studentSection) studentSection.style.display = 'block';
                if (navLinkStudents) navLinkStudents.style.display = 'inline-block';
                if (drawerLinkStudents) drawerLinkStudents.style.display = 'block';

                if (myclassSection) myclassSection.style.display = 'none';
                if (navLinkMyclass) navLinkMyclass.style.display = 'none';
                if (drawerLinkMyclass) drawerLinkMyclass.style.display = 'none';
                if (btnStudentLoginToggle) {
                    btnStudentLoginToggle.classList.remove('active-admin');
                    btnStudentLoginToggle.querySelector('span').textContent = '학생/학부모 로그인';
                }

                renderNotices();
                renderStudents();
            } else {
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

                if (btnStudentLoginToggle) {
                    btnStudentLoginToggle.classList.add('active-admin');
                    btnStudentLoginToggle.querySelector('span').textContent = '마이클래스 로그아웃';
                }
                if (myclassSection) myclassSection.style.display = 'block';
                if (navLinkMyclass) navLinkMyclass.style.display = 'inline-block';
                if (drawerLinkMyclass) drawerLinkMyclass.style.display = 'block';

                if (btnAdminToggle) {
                    btnAdminToggle.classList.remove('active-admin');
                    btnAdminToggle.querySelector('span').textContent = '관리자 로그인';
                    const adminIcon = btnAdminToggle.querySelector('.admin-icon-wrapper');
                    if (adminIcon) adminIcon.innerHTML = '<i data-lucide="lock"></i>';
                }
                if (btnAdminWrite) btnAdminWrite.style.display = 'none';
                if (studentSection) studentSection.style.display = 'none';
                if (navLinkStudents) navLinkStudents.style.display = 'none';
                if (drawerLinkStudents) drawerLinkStudents.style.display = 'none';

                renderMyClass();
            }
        } else {
            // No session
            const isUUID = (id) => typeof id === 'string' && id.includes('-');
            if (isStudent && isUUID(loggedInStudentId)) {
                isStudent = false;
                loggedInStudentId = null;
                
                if (btnStudentLoginToggle) {
                    btnStudentLoginToggle.classList.remove('active-admin');
                    btnStudentLoginToggle.querySelector('span').textContent = '학생/학부모 로그인';
                }
                if (myclassSection) myclassSection.style.display = 'none';
                if (navLinkMyclass) navLinkMyclass.style.display = 'none';
                if (drawerLinkMyclass) drawerLinkMyclass.style.display = 'none';
            }
        }

        safeCreateIcons();
        renderNotices();
        if (isAdmin) renderStudents();
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
            if (!select) return;
            select.innerHTML = '<option value="">직접 입력 (반 없음)</option>';
            classes.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.textContent = c.name;
                select.appendChild(opt);
            });
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
        // Initialize class select dropdown inside student form
        populateClassSelect();
        populateClassFilter();
        renderClassList();
        renderMainScheduleTable();
        updateTotalStudentsCount();

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
        let currentConsultFilter = 'all'; // all, pending, completed

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
        const renderConsultList = () => {
            if (!consultListTbody) return;
            
            let filtered = consultations;
            if (currentConsultFilter === 'pending') {
                filtered = consultations.filter(c => c.status === 'pending');
            } else if (currentConsultFilter === 'completed') {
                filtered = consultations.filter(c => c.status === 'completed');
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
                const statusTag = isPending
                    ? `<span style="background: #fffbe6; border: 1px solid #ffe58f; color: #d46b08; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 700; display: inline-block;">미완료</span>`
                    : `<span style="background: #f6ffed; border: 1px solid #b7eb8f; color: #389e0d; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 700; display: inline-block;">완료</span>`;

                const actionBtn = isPending
                    ? `<button type="button" class="btn-toggle-status" data-id="${c.id}" data-status="completed" style="background: var(--primary-color); color: white; border: none; padding: 4px 10px; border-radius: 4px; font-size: 0.75rem; font-weight: 600; cursor: pointer; transition: var(--transition-smooth);">상담 완료 처리</button>`
                    : `<button type="button" class="btn-toggle-status" data-id="${c.id}" data-status="pending" style="background: #f4f4f5; color: var(--text-secondary); border: 1px solid var(--border-color); padding: 4px 10px; border-radius: 4px; font-size: 0.75rem; font-weight: 600; cursor: pointer; transition: var(--transition-smooth);">미완료 처리</button>`;

                return `
                    <tr style="border-bottom: 1px solid var(--border-color-split);">
                        <td style="padding: 12px; font-size: 0.8rem; color: var(--text-secondary); text-align: left;">${c.date}</td>
                        <td style="padding: 12px; font-weight: 700; font-size: 0.85rem; color: var(--text-primary); text-align: left;">${c.name}</td>
                        <td style="padding: 12px; font-size: 0.85rem; color: var(--text-primary); text-align: left;">${c.phone}</td>
                        <td style="padding: 12px; font-size: 0.82rem; color: var(--text-secondary); text-align: left;">
                            <div style="font-weight: 500;">${c.school}</div>
                            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">${c.grade}</div>
                        </td>
                        <td style="padding: 12px; font-size: 0.82rem; color: var(--text-primary); text-align: left; max-width: 300px; word-break: break-all; white-space: pre-line;">${c.memo || '<span style="color: var(--text-muted); font-style: italic;">내용 없음</span>'}</td>
                        <td style="padding: 12px; text-align: center;">${statusTag}</td>
                        <td style="padding: 12px; text-align: center; display: flex; gap: 6px; justify-content: center; align-items: center; min-height: 48px;">
                            ${actionBtn}
                            <button type="button" class="btn-delete-consult" data-id="${c.id}" style="background: none; border: none; color: var(--error-color); cursor: pointer; padding: 4px;" aria-label="삭제"><i data-lucide="trash-2" style="width: 16px; height: 16px;"></i></button>
                        </td>
                    </tr>
                `;
            }).join('');

            safeCreateIcons();
        };

        // Filter Tabs for Consultations
        consultTabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                consultTabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentConsultFilter = btn.getAttribute('data-filter');
                renderConsultList();
            });
        });

        // Click delegation on Consultations Table Body
        if (consultListTbody) {
            consultListTbody.addEventListener('click', (e) => {
                const btnToggle = e.target.closest('.btn-toggle-status');
                if (btnToggle) {
                    const id = Number(btnToggle.getAttribute('data-id'));
                    const nextStatus = btnToggle.getAttribute('data-status');
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

        // Initial Renders
        renderCurriculumGrid();

        safeCreateIcons();
        renderNotices();
        if (isAdmin) {
            renderStudents();
            renderConsultList();
            renderAdminCurriculumList();
        }
});
