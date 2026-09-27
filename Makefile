.PHONY: install dev-web build up down

install:
	cd frontend && npm install

dev-web:
	cd frontend && npm run dev

build:
	cd frontend && npm run build

up:
	docker compose up -d --build

down:
	docker compose down
