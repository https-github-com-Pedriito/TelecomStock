# TelecomStock - Database Setup

Cette branche contient **uniquement** la configuration Docker pour lancer la base de données PostgreSQL.

## 📦 Contenu

- **PostgreSQL 14** : Base de données principale
- **Ollama** : Serveur IA local (optionnel)
- **pgAdmin** : Interface web de gestion PostgreSQL (optionnel)

## 🚀 Démarrage rapide

### Lancer uniquement PostgreSQL

```bash
cd docker
docker-compose up db
```

La base de données sera accessible sur **localhost:15432**

### Lancer PostgreSQL + pgAdmin

```bash
cd docker
docker-compose up db pgadmin
```

- **Base de données** : localhost:15432
- **pgAdmin** : http://localhost:8080
  - Email: admin@local.com
  - Password: adminpassword

### Lancer PostgreSQL + Ollama (IA)

```bash
cd docker
docker-compose up db ollama
```

## 🔧 Configuration

### Identifiants PostgreSQL

```
Host: localhost
Port: 15432
Database: telecomstock
User: admin
Password: adminpassword
```

### Variables d'environnement pour l'API

```env
DB_HOST=localhost
DB_PORT=15432
DB_USER=admin
DB_PASSWORD=adminpassword
DB_NAME=telecomstock
```

## 📋 Scripts SQL

- `init.sql` : Script d'initialisation de la base de données (tables, données de test)
- `create-ai-user.sql` : Création d'un utilisateur pour l'assistant IA

## 🛑 Arrêter les services

```bash
docker-compose down
```

Pour supprimer également les données :

```bash
docker-compose down -v
```

## 📖 Documentation

Cette branche est destinée à être utilisée avec :
- **Branche `api-only`** : API backend Node.js/TypeORM
- **Branche `frontend-only`** : Application React/Vite

## 🔗 Liens utiles

- Documentation PostgreSQL : https://www.postgresql.org/docs/14/
- Docker Compose : https://docs.docker.com/compose/
- pgAdmin : https://www.pgadmin.org/

## 💡 Notes

- Les données sont persistées dans un volume Docker `postgres_data`
- Le port 15432 est utilisé pour éviter les conflits avec une installation PostgreSQL locale (5432)
- pgAdmin est pré-configuré avec les connexions aux bases de données
