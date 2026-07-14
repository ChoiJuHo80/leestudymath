const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// 1. Remove myclass-child-selector-container
const childSelectStart = html.indexOf('<div class="child-selector-widget" id="myclass-child-selector-container"');
if (childSelectStart !== -1) {
    const childSelectEnd = html.indexOf('</div>', html.indexOf('</div>', childSelectStart) + 1) + 6;
    html = html.slice(0, childSelectStart) + html.slice(childSelectEnd);
}

// 2. Hide "시험지함" and "나의 배지 진열대" in parent-quick-menu
// find id="parent-quick-menu"
const parentQuickMenuStart = html.indexOf('<div id="parent-quick-menu"');
if (parentQuickMenuStart !== -1) {
    const parentQuickMenuEnd = html.indexOf('</div>', parentQuickMenuStart) + 6;
    let menuHtml = html.slice(parentQuickMenuStart, parentQuickMenuEnd);
    
    // Hide student-exam-section link
    menuHtml = menuHtml.replace(
        /<a href="#student-exam-section" style="display: inline-flex;/g,
        '<a href="#student-exam-section" style="display: none;'
    );
    // Hide myclass-badge-shelf-widget link
    menuHtml = menuHtml.replace(
        /<a href="#myclass-badge-shelf-widget" style="display: inline-flex;/g,
        '<a href="#myclass-badge-shelf-widget" style="display: none;'
    );
    
    // Add new Graded Exams link
    const examMenuStr = '<a href="#student-exam-section"';
    const insertPos = menuHtml.indexOf(examMenuStr);
    const newMenuLink = `
                        <a href="#parent-graded-exams-widget" id="parent-menu-graded-exams" style="display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; font-size: 0.85rem; font-weight: 700; color: var(--text-primary); text-decoration: none; border-radius: 50px; background: #f1f5f9; border: 1px solid var(--border-color); transition: all 0.2s ease;" onmouseover="this.style.background='#ffffff'; this.style.borderColor='var(--mascot-pink-bg)';" onmouseout="this.style.background='#f1f5f9'; this.style.borderColor='var(--border-color)';">
                            <i data-lucide="file-check-2" style="width: 14px; height: 14px; color: var(--mascot-pink-bg);"></i> 채점완료된 시험지
                        </a>`;
    menuHtml = menuHtml.slice(0, insertPos) + newMenuLink + menuHtml.slice(insertPos);
    
    html = html.slice(0, parentQuickMenuStart) + menuHtml + html.slice(parentQuickMenuEnd);
}

// 3. Add individual child selector containers for Calendar and Daily Habit
// Calendar widget id: myclass-calendar-widget
const calendarStart = html.indexOf('<div class="widget" id="myclass-calendar-widget"');
if (calendarStart !== -1) {
    // Find the end of the h3 tag
    const h3End = html.indexOf('</h3>', calendarStart) + 5;
    const childSelectHtml = `
                                <div class="widget-child-selector" id="calendar-child-selector" style="display: none; gap: 6px; margin-top: 10px; flex-wrap: wrap;"></div>`;
    html = html.slice(0, h3End) + childSelectHtml + html.slice(h3End);
}

// Daily habit widget id: myclass-daily-habit-widget
const habitStart = html.indexOf('<div class="widget" id="myclass-daily-habit-widget"');
if (habitStart !== -1) {
    const h3End = html.indexOf('</h3>', habitStart) + 5;
    const childSelectHtml = `
                                <div class="widget-child-selector" id="habit-child-selector" style="display: none; gap: 6px; margin-top: 10px; flex-wrap: wrap;"></div>`;
    html = html.slice(0, h3End) + childSelectHtml + html.slice(h3End);
}

// 4. Add Graded Exams Widget HTML right before AI Solver or after Homework
const homeworkStart = html.indexOf('<div class="widget" style="padding: 24px; border: 1px solid var(--border-color); border-radius: 20px; display: flex; flex-direction: column; gap: 16px;">');
// Wait, homework widget doesn't have an ID for the outer div, but it contains id="myclass-homework-list"
const homeworkListStart = html.indexOf('<div id="myclass-homework-list"');
let insertWidgetPos = html.indexOf('</div>', html.indexOf('</div>', homeworkListStart) + 1) + 6; // end of homework widget

const gradedExamsHtml = `

                            <!-- Parent Graded Exams Widget -->
                            <div class="widget parent-only-widget" id="parent-graded-exams-widget" style="display: none; padding: 24px; border: 1px solid var(--border-color); border-radius: 20px; flex-direction: column; gap: 16px;">
                                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                                    <h3 style="font-family: var(--ff-logo); font-size: 1.3rem; display: flex; align-items: center; gap: 8px; margin: 0;">
                                        <i data-lucide="file-check-2" style="color: var(--mascot-pink-bg);"></i>채점완료된 시험지
                                    </h3>
                                    <div style="display: flex; gap: 8px; align-items: center;">
                                        <select id="parent-exam-grade-filter" style="padding: 6px 12px; font-size: 0.85rem; border-radius: 8px; border: 1px solid var(--border-color); outline: none;">
                                            <option value="all">전학년</option>
                                            <option value="1학년">1학년</option>
                                            <option value="2학년">2학년</option>
                                            <option value="3학년">3학년</option>
                                            <option value="4학년">4학년</option>
                                            <option value="5학년">5학년</option>
                                            <option value="6학년">6학년</option>
                                        </select>
                                        <select id="parent-exam-semester-filter" style="padding: 6px 12px; font-size: 0.85rem; border-radius: 8px; border: 1px solid var(--border-color); outline: none;">
                                            <option value="all">전학기</option>
                                            <option value="1학기">1학기</option>
                                            <option value="2학기">2학기</option>
                                        </select>
                                    </div>
                                </div>
                                <p style="font-size: 0.85rem; color: var(--text-secondary); margin: 0;">자녀들의 자동 채점된 시험 결과를 확인하고 향상도를 비교합니다.</p>
                                
                                <div id="parent-graded-exams-list" style="display: flex; flex-direction: column; gap: 12px; margin-top: 10px;">
                                    <!-- Populated dynamically -->
                                </div>
                            </div>`;
                            
html = html.slice(0, insertWidgetPos) + gradedExamsHtml + html.slice(insertWidgetPos);

fs.writeFileSync('index.html', html, 'utf8');
console.log('index.html patched');
