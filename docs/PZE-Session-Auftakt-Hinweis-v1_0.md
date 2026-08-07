# Session-Auftakt: Ordner-Freigabe & Versions-Check

## Hintergrund
Cowork-Sessions in diesem Projekt laufen in der Cloud (Anthropic-Sandbox), nicht direkt auf Martins MacBook. Deshalb ist der Ordner
`~/Documents/Dev/pze/downloads` (`/Users/mdbs/Documents/Dev/pze/downloads`) **nicht automatisch verbunden**. Der Zugriff muss pro Session einmal ausdruecklich von Martin bestaetigt werden - das ist eine bewusste Sicherheitsgrenze und kann durch keine Anweisung umgangen werden.

## Was Claude zu Beginn jeder Session tut
1. Selbststaendig die Ordner-Freigabe fuer `downloads/` anfordern (`device_request_folder_access` auf `~/Documents/Dev/pze/downloads`). Dadurch erscheint bei Martin nur ein Bestaetigungsdialog - ein Klick statt Raetselraten, warum der Ordner fehlt.
2. Direkt danach den ueblichen Versions-Check fahren: je Basisname nur die hoechste Version pruefen, ASCII-Konformitaet der `.ts`/`.tsx`-Quelldateien bestaetigen, Auffaelligkeiten (fehlende/unstimmige Builds, Altstaende im Hauptordner) melden - bevor auf einer Datei aufgebaut wird.

## Was technisch NICHT geht (und warum)
- **Kein automatischer Ordnerzugriff ohne Bestaetigung.** Die Freigabe ist bewusst pro Session zu bestaetigen (sonst koennte jede Cloud-Session ungefragt auf die Festplatte zugreifen).
- **Kein erzwungener Cowork-/Cloud-Modus per Projekt-Anweisung.** Ob neue Aufgaben in der Cloud starten, stellt Martin in der Desktop-App ein: Einstellungen -> Cowork -> "Neue Aufgaben in der Cloud ausfuehren" bzw. ueber den Auswahlknopf oben rechts beim Aufgabenstart.

## Textbaustein fuer das Feld "Anweisungen" (von Martin per Stift-Symbol einzufuegen, z. B. unter "Session-Auftakt")
> Ordner-Freigabe: Diese Sessions laufen in der Cloud (Cowork), daher ist mein `downloads`-Ordner (`~/Documents/Dev/pze/downloads`) nicht automatisch verbunden. Fordere zu Beginn jeder Session selbststaendig den Zugriff auf diesen Ordner an (device_request_folder_access), sodass bei mir nur ein Bestaetigungsdialog erscheint, und fahre anschliessend direkt den Versions-Check.
