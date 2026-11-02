/** Order lookup by phone number on the tracking page. */
import type { arTrack } from "./ar.track";

export const frTrack: Record<keyof typeof arTrack, string> = {
  "track.title": "Suivez votre commande avec votre téléphone",
  "track.body": "Entrez le numéro utilisé à la commande pour voir l'état de vos commandes.",
  "track.phoneLabel": "Numéro de téléphone",
  "track.phoneInvalid": "Numéro invalide. Écrivez-le ainsi : 0555123456",
  "track.search": "Voir mes commandes",
  "track.searching": "Recherche…",
  "track.noOrders":
    "Aucune commande trouvée pour ce numéro. Vérifiez le numéro utilisé à la commande et réessayez.",
  "track.rateLimited": "Trop d'essais. Réessayez dans {minutes} min.",
  "track.failed": "Recherche impossible pour le moment. Réessayez dans un instant.",
  "track.found": "Vos commandes ({count})",
  "track.orderFrom": "Commande du {date}",
  "track.recipient": "Destinataire",
  "track.showDetails": "Voir le suivi",
  "track.hideDetails": "Masquer",
  "track.privacy": "Pour votre sécurité, nous n'affichons ni l'adresse complète ni le nom complet.",
  "track.haveNumber": "Vous avez un numéro de commande ?",
};
