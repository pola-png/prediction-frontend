'use client';

import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { Goal, Home, ShieldCheck, Rocket, BarChart, Trophy, ListChecks } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from './ui/button';

const menuItems = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/predictions/vip', label: 'VIP', icon: ShieldCheck },
  { href: '/predictions/2odds', label: '2 Odds', icon: Rocket },
  { href: '/predictions/5odds', label: '5 Odds', icon: BarChart },
  { href: '/predictions/big10', label: 'Big 10+', icon: Trophy },
  { href: '/results', label: 'Results', icon: ListChecks },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="text-primary hover:bg-transparent" asChild>
            <Link href="/" aria-label="Home">
              <Goal className="w-6 h-6" />
            </Link>
          </Button>
          <h1 className="text-xl font-semibold text-foreground">GoalGazer</h1>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.label}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href}
                tooltip={{ children: item.label }}
              >
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
      </SidebarFooter>
    </Sidebar>
  );
}
