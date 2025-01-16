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

export function isStreamConnection(subject: unknown): subject is StreamConnection {
  if (!subject) return false;
  if ('object' !== typeof subject) return false;

  // @ts-ignore We're a typeguard, you blithering idiot of a language
  if ('function' !== typeof subject.write) return false;
  // @ts-ignore We're a typeguard, you blithering idiot of a language
  if ('function' !== typeof subject.close) return false;
  // @ts-ignore We're a typeguard, you blithering idiot of a language
  if ('function' !== typeof subject.on) return false;

  return true;
}
