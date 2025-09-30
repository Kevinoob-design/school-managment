import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnnouncementItemComponent } from './announcement-item';

describe('AnnouncementItemComponent', () => {
  let component: AnnouncementItemComponent;
  let fixture: ComponentFixture<AnnouncementItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnnouncementItemComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AnnouncementItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
