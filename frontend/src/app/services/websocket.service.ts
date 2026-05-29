import { Injectable, signal, WritableSignal } from '@angular/core';

export interface WsMessage {
  direction: 'sent' | 'received';
  text: string;
  timestamp: Date;
}

export interface WsConnection {
  id: string;
  status: 'connecting' | 'open' | 'closed';
  messages: WritableSignal<WsMessage[]>;
}

@Injectable({ providedIn: 'root' })
export class WebSocketService {
  private sockets = new Map<string, WebSocket>();
  private counter = 0;

  readonly connections = signal<WsConnection[]>([]);

  private wsUrl = 'ws://localhost:5050/ws';

  createConnection(): string {
    const id = `conn-${++this.counter}`;
    const messages = signal<WsMessage[]>([]);

    const conn: WsConnection = { id, status: 'connecting', messages };
    this.connections.update((conns) => [...conns, conn]);

    const ws = new WebSocket(this.wsUrl);

    ws.onopen = () => {
      conn.status = 'open';
      this.emit();
    };

    ws.onmessage = (event) => {
      messages.update((msgs) => [
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
    const conn = this.connections().find((c) => c.id === id);
    if (conn) {
      conn.status = 'closed';
      this.emit();
    }
  }

  removeConnection(id: string): void {
    this.closeConnection(id);
    this.connections.update((conns) => conns.filter((c) => c.id !== id));
  }

  send(id: string, message: string): void {
    const ws = this.sockets.get(id);
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    ws.send(message);

    const conn = this.connections().find((c) => c.id === id);
    if (conn) {
      conn.messages.update((msgs) => [
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

  private emit(): void {
    this.connections.update((conns) => [...conns]);
  }
}
