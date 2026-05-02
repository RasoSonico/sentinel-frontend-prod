import { CatalogoApiResponse } from "src/types/catalogo";
import { ConceptoApiResponse } from "src/types/concepto";
import { PartidaApiResponse } from "src/types/partida";

export const catalogsMockData: CatalogoApiResponse = {
  count: 5,
  next: null,
  previous: null,
  results: [
    {
      id: 1,
      construction: null,
      name: "Cimentaciones",
      creation_date: "2025-05-01T17:14:23.872723Z",
      is_active: true,
      reason_of_change: "",
    },
    {
      id: 2,
      construction: null,
      name: "Albañilerías",
      creation_date: "2025-05-01T17:30:39.875297Z",
      is_active: true,
      reason_of_change: "",
    },
    {
      id: 3,
      construction: 2,
      name: "Estructuras",
      creation_date: "2025-05-02T18:23:31.420065Z",
      is_active: true,
      reason_of_change: "",
    },
    {
      id: 4,
      construction: 1,
      name: "Catalogo de Prueba",
      creation_date: "2025-05-02T18:29:20.744081Z",
      is_active: true,
      reason_of_change: "",
    },
    {
      id: 5,
      construction: 2,
      name: "Catalogo de Edificio Grande",
      creation_date: "2025-05-02T18:29:37.954857Z",
      is_active: true,
      reason_of_change: "",
    },
  ],
};

export const conceptoMockData: ConceptoApiResponse = {
  "count": 5,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "catalog": 2,
      "work_item": 4,
      "description": "Despalme de acuerdo con el espesor indicado en el proyecto, el material producto del despalme se utilizará para el recubrimiento de taludes de  terraplenes,  de  los  pisos,  fondos  de  excavaciones  o  taludes  de  los  bancos  al  terminar  su  explotación, incluye carga a unidades de transporte, por unidad de obra terminada.",
      "unit": "m3",
      "quantity": "200.00",
      "unit_price": "50.28",
      "clasification": "ORD"
    },
    {
      "id": 2,
      "catalog": 2,
      "work_item": 4,
      "description": "Suministro y colocación de tabique rojo recocido, de medidas standar",
      "unit": "m2",
      "quantity": "396.00",
      "unit_price": "2000.00",
      "clasification": "ORD"
    },
    {
      "id": 3,
      "catalog": 1,
      "work_item": 8,
      "description": "A",
      "unit": "ml",
      "quantity": "56.00",
      "unit_price": "555.00",
      "clasification": "ORD"
    }
  ]
}

export const partidaMockData: PartidaApiResponse = {
  "count": 8,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "catalog": 1,
      "name": "Zapata corrida"
    },
    {
      "id": 2,
      "catalog": 1,
      "name": "Cepas"
    },
    {
      "id": 3,
      "catalog": 1,
      "name": "Excavaciones"
    }
  ]
}
