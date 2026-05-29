import { Component, inject, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WebSocketService } from './services/websocket.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnDestroy {
  private ws = inject(WebSocketService);

  connections = this.ws.connections;
  inputMap: Record<string, string> = {};
  darkMode = localStorage.getItem('theme') !== 'light';

  spamMessage = '';
  spamRunning = false;
  private spamInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    document.documentElement.classList.toggle('dark', this.darkMode);
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
    this.stopSpam();
  }
}
