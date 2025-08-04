# PartiPay Deployment Guide voor Render

## Vereiste Environment Variables voor Render

Voeg deze environment variables toe in je Render dashboard:

### Database
```
DATABASE_URL=<your-postgresql-url>
PGHOST=<postgres-host>
PGPORT=5432
PGDATABASE=<database-name>
PGUSER=<username>
PGPASSWORD=<password>
```

### Tink Bank Integration
```
TINK_CLIENT_ID=<your-tink-client-id>
TINK_CLIENT_SECRET=<your-tink-client-secret>
TINK_REDIRECT_URI=https://your-app.onrender.com/auth/tink/callback
```

### Session Management
```
SESSION_SECRET=<generate-random-string-32-chars>
NODE_ENV=production
```

### Render Specifiek
```
PORT=10000
RENDER=true
```

## Bekende Issues en Oplossingen

### 1. Bankrekening Koppeling Werkt Niet
**Probleem**: Tink OAuth flow faalt op productie
**Oorzaak**: 
- TINK_CLIENT_SECRET ontbreekt
- Redirect URI niet correct ingesteld
- CORS issues met Tink API

**Oplossing**:
1. Voeg TINK_CLIENT_SECRET toe aan Render environment variables
2. Update TINK_REDIRECT_URI naar je productie domein
3. Controleer Tink dashboard dat je domein is toegevoegd

### 2. Database Connection Issues
**Probleem**: App kan geen verbinding maken met PostgreSQL
**Oorzaak**: Connection string format verschillen

**Oplossing**:
1. Gebruik DATABASE_URL format: `postgresql://user:pass@host:port/dbname`
2. Run database migrations: `npm run db:push`

### 3. WebSocket Connection Fails
**Probleem**: Real-time updates werken niet
**Oorzaak**: Render proxy configuratie

**Oplossing**: WebSocket wordt automatisch gehandeld door Render

### 4. Static Files (QR Codes) Niet Toegankelijk
**Probleem**: /simple-qr.html en andere static files laden niet
**Oorzaak**: Routes zijn al geconfigureerd in server/routes.ts

**Test URLs**:
- https://your-app.onrender.com/simple-qr.html
- https://your-app.onrender.com/table-qr-code.html
- https://your-app.onrender.com/generate-qr-svg.html

## Deployment Checklist

- [ ] Database environment variables ingesteld
- [ ] Tink API credentials toegevoegd
- [ ] SESSION_SECRET gegenereerd
- [ ] Render domein toegevoegd aan Tink dashboard
- [ ] Database migrations uitgevoerd
- [ ] QR code pagina's getest

## Debug Commands

Voor local testing met productie configuratie:
```bash
NODE_ENV=production npm run dev
```

Voor database debugging:
```bash
npm run db:push
npm run db:studio
```

## Support

Als bankrekening koppeling nog steeds niet werkt:
1. Check Render logs voor Tink API errors
2. Verify Tink developer dashboard settings
3. Test OAuth flow met correcte redirect URI