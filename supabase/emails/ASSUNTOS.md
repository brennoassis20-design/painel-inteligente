# Assuntos dos e-mails do Supabase (Authentication > Emails > Templates)

Só o ASSUNTO precisa ser colado à mão no painel do Supabase; o HTML vem dos arquivos desta pasta.

## Invite (convite) — reserva
Usado só quando a Brevo não está disponível (área com e-mail desligado, como a do Daniel, ou falha da Brevo).
Assunto:

```
{{ if .Data.produto_nome }}{{ .Data.produto_nome }}: seu acesso chegou ✅{{ else if .Data.area_nome }}{{ .Data.area_nome }}: seu acesso chegou ✅{{ else }}<manter o assunto atual do Painel>{{ end }}
```

Troque `<manter o assunto atual do Painel>` pelo assunto que já está configurado hoje no Invite.

O corpo (convite.html) mostra "O conteúdo não fica na <plataforma>, fica aqui" quando existe `.Data.produto_nome`.

## E-mail principal (Brevo)
O e-mail "seu acesso chegou" da compra e o lembrete saem pela Brevo (lib/membros-acesso-email.ts), com assunto montado no código:
- `<Produto principal>: seu acesso chegou ✅`
- com bônus: `<Produto principal> + N bônus: seu acesso chegou ✅`
- lembrete: `Lembrete: seu acesso a <produto> está esperando`

## Validade do link
Os links de generate_link (invite/magiclink) expiram conforme "Email OTP Expiration" em Authentication > Providers > Email (padrão 3600 s = 1 h). Sugestão: subir para 86400 s (24 h), porque o lembrete de 3 h/24 h gera link novo mas o aluno costuma abrir o primeiro e-mail horas depois.
