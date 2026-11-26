using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Collections.Generic;
using System.Threading;

class Launcher {
    static readonly Dictionary<string,string> Files = new Dictionary<string,string>(StringComparer.Ordinal);
    static void Serve(object state) {
        using (var client = (TcpClient)state) {
            try {
                client.ReceiveTimeout = 5000;
                client.SendTimeout = 5000;
                var stream = client.GetStream();
                var header = new StringBuilder();
                while (header.Length < 16384) {
                    int ch = stream.ReadByte();
                    if (ch < 0) return;
                    header.Append((char)ch);
                    int n = header.Length;
                    if (n >= 4 && header[n-4]=='\r' && header[n-3]=='\n' && header[n-2]=='\r' && header[n-1]=='\n') break;
                }
                var line = header.ToString().Split('\n')[0].Trim().Split(' ');
                string file;
                bool get = line.Length==3 && line[0]=="GET";
                bool head = line.Length==3 && line[0]=="HEAD";
                string path = line.Length==3 ? line[1].Split('?')[0] : "";
                bool found = Files.TryGetValue(path=="/" ? "/index.html" : path,out file);
                bool ok = (get || head) && found;
                byte[] content = ok ? File.ReadAllBytes(file) : new byte[0];
                string mime = "application/octet-stream";
                if (ok) switch (Path.GetExtension(file)) {
                    case ".html": mime="text/html; charset=utf-8";break;
                    case ".js": mime="application/javascript; charset=utf-8";break;
                    case ".css": mime="text/css; charset=utf-8";break;
                    case ".png": mime="image/png";break;
                    case ".svg": mime="image/svg+xml";break;
                }
                var response = Encoding.ASCII.GetBytes("HTTP/1.1 "+(ok?"200 OK":"404 Not Found")+"\r\nContent-Type: "+mime+"\r\nContent-Length: "+content.Length+"\r\nConnection: close\r\nCache-Control: no-cache\r\nX-Content-Type-Options: nosniff\r\n\r\n");
                stream.Write(response,0,response.Length);
                if(get && ok) stream.Write(content,0,content.Length);
            } catch(IOException) {} catch(SocketException) {}
        }
    }
    static int Main(string[] args) {
        try {
            var root = Path.Combine(AppDomain.CurrentDomain.BaseDirectory,"dist");
            if (!File.Exists(Path.Combine(root,"index.html"))) throw new IOException("Extrae todo el ZIP antes de abrir Anden.");
            foreach (var f in Directory.GetFiles(root,"*",SearchOption.AllDirectories)) Files.Add(f.Substring(root.Length).Replace('\\','/'),f);
            var server = new TcpListener(IPAddress.Loopback,4186);
            try {server.Start();} catch(SocketException) { server = new TcpListener(IPAddress.Loopback,0); server.Start(); }
            var url="http://127.0.0.1:"+((IPEndPoint)server.LocalEndpoint).Port+"/";
            Console.WriteLine("Anden - Mi Transporte\n"+url+"\nDeja abierta esta ventana mientras usas la app. Cierrala para salir.");
            if(Array.IndexOf(args,"--no-browser")<0) {
                try {Process.Start(new ProcessStartInfo(url){UseShellExecute=true});}
                catch(Exception){ Console.WriteLine("Abre la direccion indicada en tu navegador."); }
            }
            while(true) ThreadPool.QueueUserWorkItem(Serve,server.AcceptTcpClient());
        } catch(Exception e) {Console.Error.WriteLine(e.Message);return 1;}
    }
}
