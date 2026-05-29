import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface WsMessage {
  direction: 'sent' | 'received';
  text: string;
  timestamp: Date;
}

export interface WsConnection {
  id: string;
  status: 'connecting' | 'open' | 'closed';
  messages$: BehaviorSubject<WsMessage[]>;
}

@Injectable({ providedIn: 'root' })
export class WebSocketService {
  private sockets = new Map<string, WebSocket>();
  private connections$ = new BehaviorSubject<WsConnection[]>([]);
  private counter = 0;

  readonly connections = this.connections$.asObservable();

  private wsUrl = 'ws://localhost:5050/ws';

  createConnection(): string {
    const id = `conn-${++this.counter}`;
    const messages$ = new BehaviorSubject<WsMessage[]>([]);

    const conn: WsConnection = { id, status: 'connecting', messages$ };
    this.addConnection(conn);

    const ws = new WebSocket(this.wsUrl);

    ws.onopen = () => {
      conn.status = 'open';
      this.emit();
    };

    ws.onmessage = (event) => {
      const msgs = messages$.value;
      messages$.next([
        ...msgs,
        { direction: 'received', text: event.data, timestamp: new Date() },
      ]);
    };

    ws.onclose = () => {
      conn.status = 'closed';
      this.sockets.delete(id);
      this.emit();
    };

    ws.onerror = () => {
      conn.status = 'closed';
      this.sockets.delete(id);
      this.emit();
    };

    this.sockets.set(id, ws);
    return id;
  }

  closeConnection(id: string): void {
    const ws = this.sockets.get(id);
    if (ws) {
      ws.close();
      this.sockets.delete(id);
    }
    const conns = this.connections$.value;
    const conn = conns.find((c) => c.id === id);
    if (conn) {
      conn.status = 'closed';
      this.emit();
    }
  }

  removeConnection(id: string): void {
    this.closeConnection(id);
    const conns = this.connections$.value.filter((c) => c.id !== id);
    this.connections$.next(conns);
  }

  send(id: string, message: string): void {
    const ws = this.sockets.get(id);
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    ws.send(message);

    const conn = this.connections$.value.find((c) => c.id === id);
    if (conn) {
      const msgs = conn.messages$.value;
      conn.messages$.next([
        ...msgs,
        { direction: 'sent', text: message, timestamp: new Date() },
      ]);
    }
  }

  sendAll(message: string): void {
    for (const [id] of this.sockets) {
      this.send(id, message);
    }
  }

  private addConnection(conn: WsConnection): void {
    this.connections$.next([...this.connections$.value, conn]);
  }

  private emit(): void {
    this.connections$.next([...this.connections$.value]);
  }
}
