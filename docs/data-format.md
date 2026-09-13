# Формат даних (`data/`)

Джерело правди для довідників — файли в репозиторії. Сайт лише читає Supabase; база наповнюється скриптами з цих файлів.

- `data/` — реальний контент (заповнюється на етапі 3).
- `data-demo/` — **демо-набір** для перевірки конвеєра (1 лікарня, 5 препаратів R-CHOP, 1 схема, 1 хвороба). Назви позначені «ДЕМО», **не для клінічного використання**. Під час першої синхронізації реальних даних демо-рядки видаляються з `--prune`.

Схема БД: [supabase/migrations](../supabase/migrations). Zod-схеми рядків: [src/schemas/catalog.ts](../src/schemas/catalog.ts), формат файлів: [scripts/lib/data-files.ts](../scripts/lib/data-files.ts).

## Структура

```
data/
  hospitals.json                 масив лікарень (шапка бланків)
  classification-systems.json    класифікатори (МКХ-10 тощо)
  drugs/<id>.json                препарат + фасування + параметри розведення
  regimens/<id>.json             схема + препарати курсу + друковані форми
  diseases/<id>/disease.json     хвороба + коди + дерево лікування
  diseases/<id>/article.uk.md    стаття (Markdown), необов'язково
  diseases/<id>/article.en.md
```

## Загальні правила

- **Ідентифікатори** (`id`): малі латинські літери, цифри, `-`, `_`, `.` (`r-chop-21`, `rituximab`). Ім'я файлу/теки = `id`. Змінювати `id` не можна без `--prune` (інакше в БД залишиться старий рядок).
- **Ключі** (`key`) дочірніх записів — локальні в межах файлу; повний id у БД: `<id батька>.<key>` (`rituximab.vial-100`).
- **Порядок** у масивах зберігається: порядок `items` = порядок введення, порядок `presentations`, `codes`, вузлів лікування = порядок показу.
- **Локалізований текст**: `{ "uk": "...", "en": "..." }`, будь-яка мова може бути відсутня, але хоча б одна — з текстом.
- Необов'язкові поля можна пропускати: вони отримують `null` / `[]` / `false`.
- Поле `"$comment"` дозволене у файлах препаратів, схем і хвороб і в БД не потрапляє.
- **Не вигадуйте клінічних значень.** Якщо параметра немає в джерелі — пропустіть поле: валідація покаже прогалину як попередження.

## hospitals.json

| Поле | Тип | |
|---|---|---|
| `id` | id | |
| `institution_name`, `department_name` | текст (укр.) | обов'язково |
| `head_of_department`, `address` | текст | |
| `doctors` | масив рядків | для вибору на формі |
| `is_default` | boolean | лише одна лікарня |

## classification-systems.json

`id` (`icd-10` — МКХ-10 ВООЗ, використовується за замовчуванням), `name` (локал.), `version`, `url`.

## drugs/&lt;id&gt;.json

| Поле | Тип | |
|---|---|---|
| `name` | локал. | МНН |
| `trade_names` | масив рядків | |
| `atc_code` | `L01FA01` | |
| `max_single_dose_mg` | число > 0 | максимальна разова доза, якщо не задана в схемі (`cap_mg`) |
| `review_rules` | `{ renal, hepatic, elderly }` | підказки щодо редукції: `true` (загальний поріг) або `{ "belowMlMin": 30 }`, `{ "aboveUmolL": 51 }`, `{ "fromAgeYears": 75 }` |
| `notes` | локал. | |
| `presentations[]` | | `key`, `form` (`vial`, `ampoule`, `tablet`, `capsule`, `syringe`, `other`), `strength_mg`, `volume_ml` (для розчинів), `label` |
| `infusion_params[]` | | `key`, `solvent` (`sodium_chloride_0_9`, `glucose_5`, `water_for_injection`), `concentration_min_mg_ml`, `concentration_max_mg_ml`, `stock_concentration_mg_ml` (концентрат після розведення у флаконі), `bag_volumes_ml` (наявні об'єми розчинника), `duration_min`, `is_default` (один на препарат) |

## regimens/&lt;id&gt;.json

| Поле | Тип | |
|---|---|---|
| `short_name` | текст | `R-CHOP-21` |
| `name`, `description` | локал. | |
| `cycle_length_days`, `default_cycles` | ціле > 0 | |
| `items[]` | | див. нижче, **порядок = порядок введення** |
| `print_forms` | | `{ "version": 1, "forms": [...] }` |

`items[]`:

| Поле | |
|---|---|
| `key`, `drug_id` | препарат із `drugs/` |
| `role` | `main` (типово), `premedication`, `supportive` |
| `route` | `iv_infusion`, `iv_bolus`, `subcutaneous`, `intramuscular`, `oral`, `intrathecal` |
| `dose_value`, `dose_unit` | доза **на одне введення**; одиниці `mg_m2`, `mg_kg`, `mg_flat`, `auc` |
| `cap_mg` | максимальна доза в цій схемі |
| `days` | дні курсу, `[1, 2, 3, 4, 5]` |
| `administrations_per_day` | кількість введень на день (типово 1) |
| `infusion_params_key` | які `infusion_params` препарату використати (типово — `is_default`) |
| `duration_min`, `fallback_solvent`, `fallback_volume_ml` | запасні значення з шаблону схеми, якщо в препараті немає параметрів розведення |
| `gap_before_min` | пауза перед введенням |
| `notes` | локал. |

`print_forms.forms[]`: `id`, `kind` (`multi_day_sheet` — таблетки та щоденні ін'єкції, один бланк на всі дні; `infusion_sheet` — окремий лист на кожен день інфузій), `title` (укр.), `itemIds` (ключі `items`), `template` (макет; детальна специфікація — етап 5, за реальними бланками).

## diseases/&lt;id&gt;/disease.json

| Поле | |
|---|---|
| `name`, `summary` | локал. |
| `codes[]` | `system_id`, `code` (`C83.3`), `is_primary` |
| `treatment[]` | вузли дерева: `key` (унікальний у межах хвороби), `kind` (`treatment`, `line`, `stage`, `group`), `title`, `description`, `regimens[]` (`regimen_id`, `notes`), `children[]` |

## Команди

```bash
npm run data:validate                        # перевірити data/
npm run data:validate:demo                   # перевірити data-demo/
npm run data:sync                            # суха перевірка: що зміниться в БД
npm run data:sync -- --apply                 # записати (потрібен SUPABASE_SECRET_KEY у .env.local)
npm run data:sync -- --apply --prune         # записати і видалити рядки, яких немає у файлах
npm run data:sync -- --sql seed.sql --prune  # SQL-транзакція для SQL Editor у Supabase (без ключа)
npm run db:check-rls                         # публічний ключ може лише читати
```

Будь-яка опція приймає `--dir data-demo`.

**Помилки** зупиняють синхронізацію (неправильний формат, посилання на неіснуючий препарат, дублікати). **Попередження** — прогалини для розрахунку (немає фасувань, параметрів розведення), синхронізацію не зупиняють.

## Зміна схеми БД

1. Нова міграція в `supabase/migrations/` (застосовані не редагувати). Нова таблиця — одразу з RLS і політикою читання.
2. Оновити Zod-схему рядка в `src/schemas/catalog.ts` (тест звіряє колонки з міграціями) і формат файлів у `scripts/lib/data-files.ts`.
3. Якщо зміна несумісна — збільшити `CATALOG_SCHEMA_VERSION` (скидає офлайн-кеш у браузерах).
4. `UPDATE_FIXTURES=1 npx vitest run scripts` — оновити тестовий знімок демо-даних.
