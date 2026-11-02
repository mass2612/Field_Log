import type { ID, Prodotto, UnitaMisura } from '../domain/types'
import { eRaccomandazione, type Nota } from '../domain/note'
import { converti } from './dose'

/**
 * Il magazzino che si scarica dalle note.
 *
 * Chi scrive "dato 2,5 kg di rame alla Marcita" ha già detto tutto: rifarlo
 * nel magazzino è il doppio lavoro che fa smettere di usare il magazzino.
 * Qui si legge quanto è stato usato, nota per nota, e lo si toglie dalla
 * giacenza.
 *
 * **Niente movimenti salvati, solo un calcolo.** Le note si correggono, si
 * annullano, cambiano prodotto: se lo scarico fosse un movimento scritto una
 * volta, ogni correzione lascerebbe il magazzino sbagliato. Calcolato ogni
 * volta, il magazzino segue la nota. È la stessa regola delle giacenze: mai
 * un contatore da aggiornare a mano.
 *
 * Non contano le raccomandazioni (sono cose da fare, non fatte) né le note
 * annullate. Una quantità senza unità si intende nell'unità del prodotto; una
 * che non si converte (litri di un prodotto in kg) si mette da parte, da
 * controllare, invece di indovinare.
 */

export interface UsoInNota {
  notaId: ID
  data: string
  campo?: string
  /** Nell'unità del prodotto. */
  quantita: number
}

export interface UsoProdotto {
  totale: number
  usi: UsoInNota[]
}

/** Prodotti nominati nelle note che in magazzino non ci sono. */
export interface ProdottoSconosciuto {
  nome: string
  totale: number
  unitaMisura?: UnitaMisura
  notaIds: ID[]
}

export interface UsoDalleNote {
  perProdotto: Map<ID, UsoProdotto>
  sconosciuti: ProdottoSconosciuto[]
  /** Quantità che non si sanno convertire: kg scritti su un prodotto in litri. */
  daControllare: { notaId: ID; nome: string; quantita: number; unitaMisura?: UnitaMisura }[]
}

export function usoDalleNote(note: Nota[], prodotti: Prodotto[]): UsoDalleNote {
  const perNome = new Map<string, Prodotto>()
  for (const p of prodotti) if (!p.annullatoIl) perNome.set(chiave(p.nome), p)

  const perProdotto = new Map<ID, UsoProdotto>()
  const sconosciuti = new Map<string, ProdottoSconosciuto>()
  const daControllare: UsoDalleNote['daControllare'] = []

  for (const nota of note) {
    if (nota.annullatoIl || eRaccomandazione(nota)) continue
    for (const riga of nota.scheda?.prodotti ?? []) {
      if (!riga.nome.trim() || !(riga.quantita! > 0)) continue
      const prodotto = perNome.get(chiave(riga.nome))

      if (!prodotto) {
        const k = chiave(riga.nome)
        const s = sconosciuti.get(k) ?? { nome: riga.nome.trim(), totale: 0, unitaMisura: riga.unitaMisura, notaIds: [] }
        const q = s.unitaMisura && riga.unitaMisura ? converti(riga.quantita!, riga.unitaMisura, s.unitaMisura) : riga.quantita
        if (q != null) s.totale += q
        if (!s.notaIds.includes(nota.id)) s.notaIds.push(nota.id)
        sconosciuti.set(k, s)
        continue
      }

      const q = converti(riga.quantita!, riga.unitaMisura ?? prodotto.unitaMisura, prodotto.unitaMisura)
      if (q == null) {
        daControllare.push({ notaId: nota.id, nome: prodotto.nome, quantita: riga.quantita!, unitaMisura: riga.unitaMisura })
        continue
      }
      const uso = perProdotto.get(prodotto.id) ?? { totale: 0, usi: [] }
      uso.totale += q
      uso.usi.push({ notaId: nota.id, data: nota.dataFatto, campo: nota.campoNome ?? nota.scheda?.campoNome, quantita: q })
      perProdotto.set(prodotto.id, uso)
    }
  }

  for (const uso of perProdotto.values()) uso.usi.sort((a, b) => b.data.localeCompare(a.data))
  return {
    perProdotto,
    sconosciuti: [...sconosciuti.values()].sort((a, b) => a.nome.localeCompare(b.nome)),
    daControllare,
  }
}

/** "Rame  ossicloruro" e "rame ossicloruro" sono lo stesso prodotto. */
function chiave(nome: string): string {
  return nome.trim().toLowerCase().replace(/\s+/g, ' ')
}
