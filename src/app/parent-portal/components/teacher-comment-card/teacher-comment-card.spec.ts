import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TeacherCommentCardComponent } from './teacher-comment-card';

describe('TeacherCommentCardComponent', () => {
  let component: TeacherCommentCardComponent;
  let fixture: ComponentFixture<TeacherCommentCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeacherCommentCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TeacherCommentCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
