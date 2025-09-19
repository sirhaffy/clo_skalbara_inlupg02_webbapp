# Watchtower Configuration Guide

## Vanliga problem och lösningar:

### 1. **Watchtower uppdaterar sig själv (oändlig loop)**
**Lösning:** Använd label för att exkludera watchtower
```yaml
--label com.centurylinklabs.watchtower.enable=false
```

### 2. **Services startar om för ofta**
**Lösning:** Konfigurera rolling updates och health checks
```yaml
--update-config parallelism=1,delay=10s,failure-action=rollback,order=start-first
--health-start-period 40s  # Ge tid för startup
```

### 3. **Watchtower kan inte komma åt Docker socket**
**Lösning:** Säkerställ rätt mount och constraint
```yaml
--mount type=bind,source=/var/run/docker.sock,target=/var/run/docker.sock
--constraint 'node.role==manager'
```

### 4. **Images uppdateras inte**
**Lösning:** Kontrollera labels och polling interval
```yaml
--env WATCHTOWER_POLL_INTERVAL=300
--label-enable  # Endast uppdatera containers med rätt label
```

### 5. **Gamla images tar för mycket plats**
**Lösning:** Aktivera cleanup
```yaml
--env WATCHTOWER_CLEANUP=true
```

## Monitoring och debugging:

### Kolla Watchtower logs:
```bash
docker service logs watchtower --follow
```

### Kolla service status:
```bash
docker service ls
docker service ps clo-fresva-app
```

### Manuell uppdatering (för testning):
```bash
docker service update --image sirhaffy/clo-fresva-app:latest clo-fresva-app
```

## Optimal konfiguration:

### Watchtower Environment Variables:
- `WATCHTOWER_POLL_INTERVAL=300` - Kolla var 5:e minut
- `WATCHTOWER_CLEANUP=true` - Ta bort gamla images
- `WATCHTOWER_ROLLING_RESTART=true` - Rolling updates
- `WATCHTOWER_TIMEOUT=60s` - Timeout för container stop
- `WATCHTOWER_INCLUDE_RESTARTING=true` - Uppdatera även restartande containers

### Service Labels för App:
- `com.centurylinklabs.watchtower.enable=true` - Aktivera för denna service
- Använd `--label-enable` på Watchtower för säkerhet

## Tips:
1. **Testa lokalt först** med `docker run` innan Swarm
2. **Använd health checks** för säker deployment  
3. **Sätt upp monitoring** av Watchtower logs
4. **Rolling updates** med `order=start-first` för zero-downtime
5. **Backup gamla images** innan cleanup om kritisk app