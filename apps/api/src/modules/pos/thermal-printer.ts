import { Injectable, Logger } from '@nestjs/common';
import { execFile } from 'child_process';
import net from 'net';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export type PrintResult = { printed: boolean; error?: string };

@Injectable()
export class ThermalPrinterService {
  private readonly log = new Logger(ThermalPrinterService.name);

  async send(payload: Buffer): Promise<PrintResult> {
    const host = process.env.POS_PRINTER_HOST?.trim();
    const portName = process.env.POS_PRINTER_PORT?.trim();
    if (host) {
      const tcpPort = Number(process.env.POS_PRINTER_TCP_PORT ?? 9100);
      return this.sendTcp(host, tcpPort, payload);
    }
    if (portName) {
      if (process.platform !== 'win32') {
        return { printed: false, error: 'USB serial print is implemented for Windows (COM port).' };
      }
      return this.sendCom(portName, payload);
    }
    return { printed: false, error: 'Set POS_PRINTER_PORT (USB COM, e.g. COM3) or POS_PRINTER_HOST.' };
  }

  private sendTcp(host: string, port: number, payload: Buffer): Promise<PrintResult> {
    return new Promise((resolve) => {
      const socket = net.connect({ host, port });
      const fail = (error: string) => {
        socket.destroy();
        this.log.warn(error);
        resolve({ printed: false, error });
      };
      socket.setTimeout(5000);
      socket.on('connect', () => {
        socket.write(payload, (err) => {
          socket.end();
          if (err) fail(err.message);
          else resolve({ printed: true });
        });
      });
      socket.on('timeout', () => fail(`Printer ${host}:${port} timed out`));
      socket.on('error', (err) => fail(err.message));
    });
  }

  private async sendCom(portName: string, payload: Buffer): Promise<PrintResult> {
    const port = portName.replace(/:$/, '').toUpperCase();
    const b64 = payload.toString('base64');
    const script = [
      `$p = New-Object System.IO.Ports.SerialPort '${port}',38400,None,8,One`,
      '$p.DtrEnable = $true',
      '$p.RtsEnable = $true',
      '$p.Handshake = [System.IO.Ports.Handshake]::None',
      '$p.WriteTimeout = 5000',
      '$p.Open()',
      `$bytes = [Convert]::FromBase64String('${b64}')`,
      '$p.Write($bytes, 0, $bytes.Length)',
      'Start-Sleep -Milliseconds 200',
      '$p.Close()',
    ].join('; ');
    try {
      await execFileAsync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], {
        timeout: 10000,
        windowsHide: true,
      });
      return { printed: true };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'USB printer write failed';
      this.log.warn(error);
      return { printed: false, error };
    }
  }
}
