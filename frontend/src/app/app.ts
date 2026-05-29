import { Component, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { WebSocketService, WsConnection } from './services/websocket.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnDestroy {
  private ws = inject(WebSocketService);
  private sub: Subscription;

  connections: WsConnection[] = [];
  inputMap: Record<string, string> = {};
  darkMode = localStorage.getItem('theme') !== 'light';

  spamMessage = '';
  spamRunning = false;
  private spamInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    document.documentElement.classList.toggle('dark', this.darkMode);
    this.sub = this.ws.connections.subscribe((conns) => {
      this.connections = conns;
    });
  }

  toggleTheme(): void {
    this.darkMode = !this.darkMode;
    document.documentElement.classList.toggle('dark', this.darkMode);
    localStorage.setItem('theme', this.darkMode ? 'dark' : 'light');
  }

  addConnection(): void {
    const id = this.ws.createConnection();
    this.inputMap[id] = '';
  }

  closeConnection(id: string): void {
    this.ws.closeConnection(id);
  }

  removeConnection(id: string): void {
    this.ws.removeConnection(id);
    delete this.inputMap[id];
  }

  send(id: string): void {
    const msg = this.inputMap[id]?.trim();
    if (!msg) return;
    this.ws.send(id, msg);
    this.inputMap[id] = '';
  }

  toggleSpam(): void {
    if (this.spamRunning) {
      this.stopSpam();
    } else {
      this.startSpam();
    }
  }

  private startSpam(): void {
    const msg = this.spamMessage.trim();
    if (!msg) return;
    this.spamRunning = true;
    this.ws.sendAll(msg);
    this.spamInterval = setInterval(() => {
      this.ws.sendAll(msg);
    }, 500);
  }

  private stopSpam(): void {
    this.spamRunning = false;
    if (this.spamInterval) {
      clearInterval(this.spamInterval);
      this.spamInterval = null;
    }
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
    this.stopSpam();
  }
}
