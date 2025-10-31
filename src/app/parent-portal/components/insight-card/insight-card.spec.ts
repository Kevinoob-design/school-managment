import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InsightCardComponent } from './insight-card';

describe('InsightCardComponent', () => {
  let component: InsightCardComponent;
  let fixture: ComponentFixture<InsightCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InsightCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(InsightCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
