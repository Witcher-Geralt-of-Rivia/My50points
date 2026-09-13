import sys
import random
import os
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import Tournament, Race, Horse, RaceResult, LeaderboardEntry
from app.routers.races import post_race_result

def simulate_tournament(tournament_slug: str):
    db = SessionLocal()
    try:
        tournament = db.query(Tournament).filter(Tournament.slug == tournament_slug).first()
        if not tournament:
            print(f"Torneo no encontrado: {tournament_slug}")
            return
        
        print(f"============================================================")
        print(f"Simulando resultados para el torneo: {tournament.name}")
        print(f"Slug: {tournament_slug}")
        print(f"Estado inicial: {tournament.status}")
        print(f"============================================================")
        
        races = db.query(Race).filter(Race.tournamentId == tournament.id).order_by(Race.raceNumber).all()
        if not races:
            print("No se encontraron carreras para este torneo.")
            return

        for race in races:
            print(f"\n--- Carrera {race.raceNumber} / {len(races)} (ID: {race.id}) ---")
            horses = db.query(Horse).filter(Horse.raceId == race.id).order_by(Horse.postPosition).all()
            if not horses:
                print(f"  No hay caballos en la carrera {race.raceNumber}. Saltando...")
                continue
            
            # Necesitamos al menos 3 caballos para post_race_result
            if len(horses) < 3:
                print(f"  Carrera {race.raceNumber} tiene menos de 3 caballos ({len(horses)}). Saltando simulación...")
                continue

            available = list(horses)
            
            # Elegir ganador, segundo y tercero al azar
            winner = random.choice(available)
            available.remove(winner)
            second = random.choice(available)
            available.remove(second)
            third = random.choice(available)
            
            results_payload = [
                {"position": 1, "horseId": winner.id},
                {"position": 2, "horseId": second.id},
                {"position": 3, "horseId": third.id}
            ]
            
            print(f"  1er Lugar (Ganador): PP {winner.postPosition} - {winner.name} (Odds: {winner.odds})")
            print(f"  2do Lugar:           PP {second.postPosition} - {second.name} (Odds: {second.odds})")
            print(f"  3er Lugar:           PP {third.postPosition} - {third.name} (Odds: {third.odds})")
            
            # Procesar el resultado usando la lógica oficial de scoring
            res = post_race_result(race.id, results_payload, db)
            print(f"  [Scoring Backend]: {res['message']}")
            if res.get("scoredTickets"):
                print(f"  [Tickets Calificados]: {len(res['scoredTickets'])} tickets procesados.")
                for t in res["scoredTickets"]:
                    print(f"    - User ID {t['userId']} (Ticket #{t['ticketNumber']}, Strategy: {t['strategy']}): +{t['points']} pts")
            else:
                print(f"  [Tickets Calificados]: Ninguno pendiente.")

        # Recargar el torneo de la BD para ver el estado final
        db.refresh(tournament)
        print(f"\n============================================================")
        print(f"Simulación finalizada.")
        print(f"Estado del Torneo: {tournament.status}")
        print(f"Carrera actual del Torneo: {tournament.currentRace}")
        
        # Consultar el leaderboard para mostrar cómo quedó
        leaderboard = db.query(LeaderboardEntry).filter(LeaderboardEntry.tournamentId == tournament.id).order_by(LeaderboardEntry.totalPoints.desc()).all()
        print(f"Leaderboard ({len(leaderboard)} participantes):")
        for i, entry in enumerate(leaderboard, start=1):
            print(f"  {i}. User ID: {entry.userId} | Ticket #{entry.ticketNumber} | Puntos: {entry.totalPoints} | Streak: {entry.bestStreak} (Cambio: {entry.rankChange})")
        print(f"============================================================")
        
    except Exception as e:
        print(f"Error durante la simulación: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        # Listar torneos disponibles
        db = SessionLocal()
        tournaments = db.query(Tournament).order_by(Tournament.date.desc()).limit(15).all()
        print("Uso: python simulate_results.py <tournament_slug>")
        print("\nTorneos disponibles en la BD:")
        for t in tournaments:
            print(f"  - {t.slug} (Status: {t.status}, Fecha: {t.date.strftime('%Y-%m-%d') if t.date else 'N/A'})")
        db.close()
    else:
        simulate_tournament(sys.argv[1])
