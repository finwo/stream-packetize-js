import { EventEmitter } from 'events';

export interface TcpConnectionEventMap {
  data: [string|Buffer];
  close: [];
}
export type TcpConnection = EventEmitter<TcpConnectionEventMap> & {
  write: (chunk: string|Buffer) => void,
  end: () => void,
};

export interface SerialConnectionEventMap {
  data: [string|Buffer];
  close: [];
}
export type SerialConnection = EventEmitter<SerialConnectionEventMap> & {
  write: (chunk: string|Buffer) => void,
  close: () => void,
};

export type StreamConnection = TcpConnection | SerialConnection;
