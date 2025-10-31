import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface NavItem {
  id: string;
  label: string;
  icon: string;
}

export interface UserInfo {
  name: string;
  subtitle: string;
}

@Component({
  selector: 'app-sidebar-nav',
  imports: [CommonModule],
  templateUrl: './sidebar-nav.html',
  styleUrl: './sidebar-nav.sass',
})
export class SidebarNav {
  // Inputs
  title = input.required<string>();
  subtitle = input.required<string>();
  navItems = input.required<NavItem[]>();
  activeItemId = input<string>();
  userInfo = input<UserInfo>();
  showUser = input(true);

  // Outputs
  navItemClick = output<string>();
  userClick = output<void>();

  // Check if an item is active
  protected isActive = computed(() => (itemId: string) => {
    return this.activeItemId() === itemId;
  });

  protected onNavItemClick(itemId: string): void {
    this.navItemClick.emit(itemId);
  }

  protected onUserSectionClick(): void {
    this.userClick.emit();
  }
}
