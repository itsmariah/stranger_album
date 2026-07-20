# Importa a classe FastAPI para criação do servidor
from fastapi import FastAPI
# Importa o middleware de CORS para permitir requisições do frontend (porta diferente)
from fastapi.middleware.cors import CORSMiddleware
# Importa o StaticFiles para servir arquivos estáticos (imagens das figurinhas)
from fastapi.staticfiles import StaticFiles
# Importa o módulo os para manipulação de caminhos de arquivos
import os

# Cria a instância da aplicação FastAPI que gerenciará as rotas e requisições
app = FastAPI()

# Libera o acesso à API para o frontend, que roda em uma origem (porta) diferente
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

# Define o caminho absoluto da pasta base (onde este arquivo está)
# Isso garante que o servidor encontre a pasta de imagens independente
# de onde o uvicorn for executado
PASTA_BASE = os.path.dirname(os.path.abspath(__file__))

# Define o caminho absoluto da pasta onde estão as imagens das figurinhas
PASTA_IMAGENS = os.path.join(PASTA_BASE, "imgs")

# "Monta" a pasta de imagens na rota "/imgs"
# Assim, "imgs/01-mike-wheeler.jpg" fica acessível em "/imgs/01-mike-wheeler.jpg"
app.mount("/imgs", StaticFiles(directory=PASTA_IMAGENS), name="imgs")

# Lista completa das figurinhas do Stranger Album - Hawkins Edition
# Cada item contém: id, nome, categoria e a URL da imagem correspondente
# As categorias espelham as páginas do álbum no frontend
figurinhas = [
    # ── THE PARTY: O Grupo de Hawkins ──────────────────────────────────────
    {"id": 1,  "nome": "Mike Wheeler",        "categoria": "The Party", "imagem_url": "/imgs/01-mike-wheeler.jpg"},
    {"id": 2,  "nome": "Dustin Henderson",    "categoria": "The Party", "imagem_url": "/imgs/02-dustin-henderson.jpg"},
    {"id": 3,  "nome": "Eleven",              "categoria": "The Party", "imagem_url": "/imgs/03-eleven.jpg"},
    {"id": 4,  "nome": "Will Byers",          "categoria": "The Party", "imagem_url": "/imgs/04-will-byers.jpg"},
    {"id": 5,  "nome": "Lucas Sinclair",      "categoria": "The Party", "imagem_url": "/imgs/05-lucas-sinclair.jpg"},
    {"id": 6,  "nome": "Max Mayfield",        "categoria": "The Party", "imagem_url": "/imgs/06-max-mayfield.jpg"},

    # ── THE TEENS: Adolescentes de Hawkins ─────────────────────────────────
    {"id": 7,  "nome": "Nancy Wheeler",       "categoria": "The Teens",  "imagem_url": "/imgs/07-nancy-wheeler.jpg"},
    {"id": 8,  "nome": "Jonathan Byers",      "categoria": "The Teens",  "imagem_url": "/imgs/08-jonathan-byers.jpg"},
    {"id": 9,  "nome": "Steve Harrington",    "categoria": "The Teens",  "imagem_url": "/imgs/09-steve-harrington.jpg"},
    {"id": 10, "nome": "Robin Buckley",       "categoria": "The Teens",  "imagem_url": "/imgs/10-robin-buckley.jpg"},
    {"id": 11, "nome": "Eddie Munson",        "categoria": "The Teens",  "imagem_url": "/imgs/11-eddie-munson.jpg"},

    # ── THE ADULTS: Adultos e Protetores ───────────────────────────────────
    {"id": 12, "nome": "Joyce Byers",         "categoria": "The Adults", "imagem_url": "/imgs/12-joyce-byers.jpg"},
    {"id": 13, "nome": "Jim Hopper",          "categoria": "The Adults", "imagem_url": "/imgs/13-jim-hopper.jpg"},
    {"id": 14, "nome": "Murray Bauman",       "categoria": "The Adults", "imagem_url": "/imgs/14-murray-bauman.jpg"},
    {"id": 15, "nome": "Bob Newby",           "categoria": "The Adults", "imagem_url": "/imgs/15-bob-newby.jpg"},
    {"id": 16, "nome": "Karen Wheeler",       "categoria": "The Adults", "imagem_url": "/imgs/16-karen-wheeler.jpg"},

    # ── MONSTERS: Ameaças do Mundo Invertido ───────────────────────────────
    {"id": 17, "nome": "Demogorgon",          "categoria": "Monsters",   "imagem_url": "/imgs/17-demogorgon.jpg"},
    {"id": 18, "nome": "Democães",            "categoria": "Monsters",   "imagem_url": "/imgs/18-demodogs.jpg"},
    {"id": 19, "nome": "Devorador de Mentes", "categoria": "Monsters",   "imagem_url": "/imgs/19-mind-flayer.jpg"},
    {"id": 20, "nome": "Vecna",               "categoria": "Monsters",   "imagem_url": "/imgs/20-vecna.jpg"},
    {"id": 21, "nome": "Demobats",            "categoria": "Monsters",   "imagem_url": "/imgs/21-demobats.jpg"},

    # ── HAWKINS Vol. 1: Mistérios e Cenários ───────────────────────────────
    {"id": 22, "nome": "Laboratório de Hawkins", "categoria": "Hawkins", "imagem_url": "/imgs/22-hawkins-lab.jpg"},
    {"id": 23, "nome": "O Porão dos Wheeler",    "categoria": "Hawkins", "imagem_url": "/imgs/23-wheeler-basement.jpg"},
    {"id": 24, "nome": "Starcourt Mall",         "categoria": "Hawkins", "imagem_url": "/imgs/24-starcourt-mall.jpg"},
    {"id": 25, "nome": "Floresta Mirkwood",      "categoria": "Hawkins", "imagem_url": "/imgs/25-floresta-mirkwood.jpg"},
    {"id": 26, "nome": "Casa dos Creel",         "categoria": "Hawkins", "imagem_url": "/imgs/26-creel-house.jpg"},

    # ── HAWKINS Vol. 2: Mais Cenários e Segredos ───────────────────────────
    {"id": 27, "nome": "Castelo Byers",       "categoria": "Hawkins",    "imagem_url": "/imgs/27-castle-byers.jpg"},
    {"id": 28, "nome": "Parede de Luzes",     "categoria": "Hawkins",    "imagem_url": "/imgs/28-parede-de-luzes.jpg"},
    {"id": 29, "nome": "Scoops Ahoy",         "categoria": "Hawkins",    "imagem_url": "/imgs/29-scoops-ahoy.jpg"},
    {"id": 30, "nome": "Palace Arcade",       "categoria": "Hawkins",    "imagem_url": "/imgs/30-palace-arcade.jpg"},
    # id 31 ("Você") fica sem figurinha: o slot é o convite para o usuário colar sua própria foto.
]

# Define o endpoint para requisições do tipo GET no caminho "/figurinhas"
@app.get("/figurinhas")
def listar_figurinhas():
    # Retorna a lista completa de figurinhas como JSON automaticamente
    return figurinhas
