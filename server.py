"""
BET WARRIORS — Servidor Local de Desenvolvimento (Opcional)
Execute com: python server.py
Abra no navegador em: http://localhost:8080
"""

import http.server
import socketserver
import webbrowser
import os
import sys

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

def main():
    os.chdir(DIRECTORY)
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        url = f"http://localhost:{PORT}"
        print("=" * 60)
        print("⚡ BET WARRIORS — SIMULADOR DE APOSTAS FICTÍCIAS")
        print("=" * 60)
        print(f"🎮 Servidor iniciado com sucesso!")
        print(f"🔗 Acesse no navegador: {url}")
        print("🛑 Pressione Ctrl+C para encerrar o servidor.")
        print("=" * 60)
        
        try:
            webbrowser.open(url)
        except Exception:
            pass

        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nEncerrando servidor. Até a próxima!")
            httpd.server_close()

if __name__ == '__main__':
    main()
