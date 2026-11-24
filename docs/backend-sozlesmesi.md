# TrakyaNet mobil sözleşmesi

Bu dosya, mobil uygulamanın beklediği API sözleşmesidir. Backend bu cevapları verdiğinde ekranlar ayrıca değişmez.

Mobil öğrenim okuma ve yazmasını `mobile/services/studyService.ts` üzerinden yapar. Katalog `GET /api/departments` ile okunur. Bu uç 404 veya ağ hatası verirse aynı JSON, `mobile/lib/curriculum.ts` tohum listesinden üretilir. Seçim, token olmadığı için giriş başarılı olana kadar telefonda bekler. Başarılı giriş veya kayıttan hemen sonra bekleyen seçim varsa `PUT /api/me/study` çağrılır ve geçici seçim silinir. Giriş kapısı telefonda kalır. Profil `GET /api/me/study` okur. Bu uç henüz yoksa kart boş durum gösterir.

Her mobil değişikliğinde bu dosya güncellenir. Yeni madde en üste, değişiklik günlüğüne eklenir.

## Ortak kurallar

- Taban adres mobil `.env` içindeki `EXPO_PUBLIC_API_URL` değeridir. Sonda eğik çizgi yoktur.
- JSON alan adları `snake_case` olur. ASP.NET tarafında `JsonNamingPolicy.SnakeCaseLower` bunu karşılar.
- Tarihler ISO 8601 olur.
- Korumalı isteklerde başlık `Authorization: Bearer {token}` olur.
- Hata gövdesi `{ "message": "..." }` olur. Mobil bu `message` alanını gösterir.
- Kayıt her zaman `system_role: "student"` üretir. Rol yükseltme yalnızca yöneticinin `PUT /api/users/{id}/role` çağrısıyla yapılır.
- Giriş gövdesine rol eklenmez. Mobil, dönen `user.system_role` değerini kullanıcının seçtiği kapıyla kendisi karşılaştırır. Kapı, giriş formundan önce seçilir: `student` Öğrenci, `teacher` Akademisyen, `admin` İdari. Akademisyen ve idari öğrenci bilgisi doldurmaz; e-posta formuna doğrudan geçer.

## Şu an çalışan uçlar

Bu uçlar mobilde bağlıdır. Ad, gövde ve cevap alanları korunur.

| Yöntem | Adres | Gövde veya sorgu | Cevap |
| --- | --- | --- | --- |
| GET | `/api/health` | yok | `{ "status": "ok" }` |
| POST | `/api/auth/register` | `full_name`, `email`, `password` | `{ "token", "user" }` |
| POST | `/api/auth/login` | `email`, `password` | `{ "token", "user" }` |
| GET | `/api/auth/me` | Bearer | kullanıcı |
| PUT | `/api/auth/me` | `full_name` | kullanıcı |
| POST | `/api/auth/me/avatar` | multipart alan adı `file`, en fazla 5 MB | kullanıcı |
| DELETE | `/api/auth/me/avatar` | Bearer | kullanıcı |
| GET | `/api/auth/me/avatar` | `access_token` sorgu parametresi | resim dosyası |
| GET | `/api/users` | `query` | kullanıcı listesi |
| PUT | `/api/users/{id}/role` | `role`: `student`, `teacher`, `admin` | 204, gövde yok |
| GET | `/api/classes` | Bearer | sınıf listesi |
| GET | `/api/classes/{id}` | Bearer | sınıf |
| POST | `/api/classes` | `name` | sınıf |
| POST | `/api/classes/join` | `code` | `{ "id" }` |
| DELETE | `/api/classes/{id}/members/me` | Bearer | 204 |
| DELETE | `/api/classes/{id}` | Bearer | 204 |
| GET | `/api/clubs` | Bearer | kulüp listesi |
| GET | `/api/clubs/{id}` | Bearer | kulüp ve `members` |
| POST | `/api/clubs` | `name`, `description` | kulüp |
| POST | `/api/clubs/{id}/join` | Bearer | |
| DELETE | `/api/clubs/{id}/members/me` | Bearer | |
| POST | `/api/clubs/{id}/members` | `user_id` | |
| PUT | `/api/clubs/{id}/members/{user_id}/role` | `role`: `member` veya `admin` | |
| GET | `/api/announcements` | `scope_type`, `scope_id` | duyuru listesi |
| POST | `/api/announcements` | `title`, `content`, `scope_type`, `scope_id` | duyuru |
| DELETE | `/api/announcements/{id}` | Bearer | |
| GET | `/api/assignments` | `class_id` | ödev listesi |
| POST | `/api/assignments` | multipart: `ClassId`, `Title`, `Description`, `DueDate`, isteğe bağlı `File` | |
| GET | `/api/assignments/{id}/file` | `access_token` sorgu parametresi | PDF |
| DELETE | `/api/assignments/{id}` | Bearer | |
| GET | `/api/messages` | `channel_type`, `channel_id` | mesaj listesi |
| POST | `/api/messages` | `channel_type`, `channel_id`, `content` | mesaj |
| DELETE | `/api/messages/{id}` | Bearer | 204 |

Kullanıcı cevabı:

```json
{
  "id": "guid",
  "full_name": "Ad Soyad",
  "email": "ad@okul.edu.tr",
  "avatar_url": null,
  "system_role": "student",
  "created_at": "2026-11-21T00:00:00+03:00"
}
```

Arama sonucunda `email` gelmez. Profil resmi, iOS `Image` bileşeni başlık gönderemediği için `GET /api/auth/me/avatar?access_token={token}` adresinden alınır. Ödev dosyası da aynı nedenle `access_token` sorgu parametresi kullanır.

Sohbet hub adresi `/hubs/chat` olur. Taşıma WebSocket, `skipNegotiation: true` olur. Token `accessTokenFactory` ile gider. Mobil `JoinChannel(channelType, channelId)` çağırır. Sunucu `MessageReceived` ve `MessageDeleted` olaylarını `{ "id" }` gövdesiyle yayınlar. `channel_type` değerleri `school`, `class`, `club` olur. Okul kanalında `channel_id` null olur.

## Hedef: bölüm, sınıf ve ders

Mobil seçim sırası şöyledir: hoş geldin, giriş türü, sonra yalnızca öğrencide bölüm ve ders. Programı olan bölümde öğrenci 1, 2, 3 ve 4. sınıfların derslerinden birlikte seçer. Ayrı bir sınıf adımı yoktur. Programı olmayan bölümde ders listesi açılmaz. Ekranda “Bu bölümün ders programı yakında eklenecek.” yazılır ve kullanıcı bölüm listesine döner.

Seçim, girişten önce yapılır. Bu sırada token yoktur. Hedef akış:

1. Katalog `GET /api/departments` ile, tokensız okunur.
2. Seçim giriş başarılı olana kadar telefonda bekler.
3. Girişten hemen sonra mobil `PUT /api/me/study` çağırır.
4. Profil `GET /api/me/study` okur.

Kullanıcı giriş ekranından seçim paneline dönebilir. Yeni seçim bir sonraki başarılı girişte yine `PUT /api/me/study` ile yazılır.

### Veri modeli

- Bölüm, kullanıcıya ait tek kayıttır. Kullanıcının tek bir sınıf yılı yoktur.
- Dersler ayrı tablodadır ve her ders kataloğunda bir sınıfa bağlıdır. Seçim, kullanıcı ile ders arasında ilişki satırıdır. Aynı kayıtta dört sınıfın dersleri bir arada durabilir.
- Aynı ders kodu birden fazla bölümde geçebilir. Ders kimliği bölüme bağlıdır.
- Kimlik kuralı `{department_id}:{kod}` olur. Kod, listedeki ders adının başındaki kodun boşluksuz halidir. Örnek: `BST 101 İktisada Giriş` için kimlik `bst:BST101`, kod `BST 101`, ad `İktisada Giriş`.

Tohum liste `mobile/lib/curriculum.ts` dosyasındadır.

| `department_id` | Ad | Program |
| --- | --- | --- |
| `bst` | Bilişim Sistemleri ve Teknolojileri | var, 1–4. sınıf |
| `gumruk` | Gümrük İşletme | yok |
| `hir` | Halkla İlişkiler ve Reklamcılık | var, 1–4. sınıf |
| `ticaret` | Uluslararası Ticaret ve Finansman | yok |
| `bankacilik` | Bankacılık ve Sigortacılık | var, 1–4. sınıf |

Her dersin sınıfı `1`, `2`, `3` veya `4` olur. Seçim bu dört sınıfın herhangi birinden, birden fazlasından ya da hepsinden gelebilir.

### GET /api/departments

Yetki yoktur. Sıra yukarıdaki tabloyla aynı olur.

```json
[
  {
    "id": "bst",
    "name": "Bilişim Sistemleri ve Teknolojileri",
    "courses_ready": true,
    "years": [
      {
        "year": 1,
        "courses": [
          { "id": "bst:BST101", "code": "BST 101", "name": "İktisada Giriş" }
        ]
      }
    ]
  },
  {
    "id": "gumruk",
    "name": "Gümrük İşletme",
    "courses_ready": false,
    "years": []
  }
]
```

`courses_ready` false ise `years` boş dizi olur. Mobil o bölümde ileri gitmez.

### GET /api/me/study

Bearer gerekir. Kayıt yoksa 404 dönülmez. Boş cevap 200 olur:

```json
{ "department_id": null, "department_name": null, "years": [] }
```

Kayıt varsa dersler sınıfına göre gruplanır. İçi boş sınıf dönülmez.

```json
{
  "department_id": "bst",
  "department_name": "Bilişim Sistemleri ve Teknolojileri",
  "years": [
    {
      "year": 2,
      "courses": [
        { "id": "bst:BST201", "code": "BST 201", "name": "Veri Yapıları" }
      ]
    },
    {
      "year": 3,
      "courses": [
        { "id": "bst:BST301", "code": "BST 301", "name": "Görsel Programlama I" }
      ]
    }
  ]
}
```

Profil bölüm adını gösterir. Seçilen her sınıf ayrı açılır listedir. Başlık `{year}. Sınıf Dersleri` olur ve dersler bu başlığın altında durur. Satır metni `{code} {name}` olur. Seçim ekranında da dört sınıf aynı başlıklarla ayrı açılır listelerdir.

### PUT /api/me/study

Bearer gerekir. Çağıran kullanıcı yalnızca kendi kaydını yazar. Öğrenci, akademisyen ve yönetici yazabilir. Seçim paneli üç kapıdan önce de açılır.

```json
{
  "department_id": "bst",
  "course_ids": ["bst:BST201", "bst:BST301"]
}
```

Kurallar:

- `department_id` katalogda vardır.
- `courses_ready` false ise 400 ve `message`: `Bu bölümün ders programı henüz yok.`
- Her `course_id` o bölümün 1, 2, 3 veya 4. sınıfındadır. Farklı sınıfların dersleri aynı istekte birlikte gelebilir.
- `course_ids` en az bir ders içerir. Aynı kimlik iki kez yazılmaz.
- Kayıt varsa yenisi eskisinin yerini alır.

Başarılı cevap, `GET /api/me/study` ile aynı dolu gövdedir.

## Hedef: ders, sınıf grubu, davet, materyal, idari kullanıcı

Mobil arayüz sınıf gruplarını, davetleri, not/ödev materyallerini ve idari kullanıcı yönetimini aşağıdaki uçlara bağlar. Mobil yalnızca bu adreslere istek atar (`USE_MOCK` kaldırıldı).

Wire formatı `snake_case` kalır. Roller `student` | `teacher` | `admin` olur (UI: Öğrenci / Akademisyen / İdari). Eski join kodlu `/api/classes` ve `/api/assignments` uçları geriye dönük belgede kalır; yeni ekranlar `/api/classrooms`, `/api/invitations` ve `/api/classrooms/{id}/materials` yolunu kullanır.

Tüm korumalı isteklerde `Authorization: Bearer {token}` gerekir. Hata gövdesi `{ "message": "..." }` olur.

### GET /api/courses

Sorgu: `department_id` (zorunlu), `grade` (`1`–`4`, zorunlu). Bölüm ve sınıf düzeyine göre dersleri ve dersi veren akademisyeni döner.

```json
[
  {
    "id": "bst:BST101",
    "code": "BST 101",
    "name": "İktisada Giriş",
    "grade": 1,
    "department_id": "bst",
    "teacher": {
      "id": "guid",
      "full_name": "Ayşe Öğretim"
    }
  }
]
```

### PUT /api/users/me/courses

Öğrencinin sınıf düzeyini ve seçtiği dersleri kaydeder.

```json
{ "grade": 1, "course_ids": ["bst:BST101", "bst:BST103"] }
```

Başarılı cevap 200:

```json
{ "grade": 1, "course_ids": ["bst:BST101", "bst:BST103"] }
```

### GET /api/courses/{course_id}/students

İlgili dersi seçen öğrencilerin listesini döner.

```json
[
  { "id": "guid", "full_name": "Ali Veli", "email": "ali@okul.edu.tr" }
]
```

### POST /api/classrooms

Akademisyen veya idari sınıf açar ve seçili öğrencilere davet gönderir.

```json
{
  "name": "BST 101 Grup A",
  "course_id": "bst:BST101",
  "invited_student_ids": ["guid-1", "guid-2"]
}
```

Cevap:

```json
{
  "id": "guid",
  "name": "BST 101 Grup A",
  "course_id": "bst:BST101",
  "course_name": "İktisada Giriş",
  "teacher_id": "guid",
  "teacher_name": "Ayşe Öğretim",
  "member_count": 0,
  "is_owner": true,
  "is_member": true,
  "created_at": "2026-11-23T00:00:00+03:00"
}
```

### GET /api/classrooms/my

Kullanıcının üyesi olduğu (öğrenci) veya yönettiği (akademisyen/idari) sınıfları döner. Öğe şeması `POST /api/classrooms` cevabıyla aynıdır; liste dizisidir.

### GET /api/classes/{class_id}/eligible-students

Akademisyen veya idari. Sınıfın bağlı olduğu dersi (ve sınıf düzeyini) seçmiş öğrencileri getirir. Sonradan davet ekranı bu listeyi kullanır. `class_id`, mobil `classroom` kimliğiyle aynıdır.

```json
[
  {
    "student_id": "guid",
    "full_name": "Ali Veli",
    "student_number": "220103001",
    "department_name": "Bilişim Sistemleri ve Teknolojileri",
    "grade": 1,
    "invitation_status": "none"
  }
]
```

`invitation_status` değerleri: `none` (davet edilmemiş, seçilebilir), `pending` (davet gönderildi), `accepted` (sınıfta).

### POST /api/classes/{class_id}/invitations

Akademisyen veya idari. Seçilen öğrencilere sınıf daveti gönderir; öğrenci bildirim ziline düşer.

```json
{ "student_ids": ["guid-1", "guid-2"] }
```

Başarılı cevap 204, gövde yok. Yalnızca `invitation_status: "none"` olan kimlikler kabul edilir; diğerleri 400 ve `message` ile reddedilir.

### GET /api/classes/{class_id}/members

Akademisyen veya idari. Sınıftaki öğrencileri (kabul etmiş üyeler) ve içerik yetkisini döner. Yetkilendirme ekranı bu listeyi kullanır.

```json
[
  {
    "student_id": "guid",
    "full_name": "Ali Veli",
    "student_number": "220103001",
    "can_manage_content": false
  }
]
```

`can_manage_content: true` olan öğrenci sınıf içinde duyuru, not ve ödev ekleyebilir.

### PATCH /api/classes/{class_id}/members/{student_id}/authority

Akademisyen (sınıf sahibi) veya idari. İçerik yetkisini açar veya kapatır.

```json
{ "can_manage_content": true }
```

Cevap, güncel üye nesnesidir (`GET /api/classes/{class_id}/members` öğesiyle aynı).

`GET /api/classrooms/my` ve sınıf detayında çağıran kullanıcı için `can_manage_content` alanı da döner: sahip akademisyen, idari veya yetkilendirilmiş üye `true` görür.

### GET /api/invitations/pending

Öğrencinin bekleyen sınıf davetlerini döner. Üst bar zil rozeti bu listenin uzunluğunu kullanır.

```json
[
  {
    "id": "guid",
    "classroom_id": "guid",
    "classroom_name": "BST 101 Grup A",
    "course_name": "İktisada Giriş",
    "teacher_name": "Ayşe Öğretim",
    "created_at": "2026-11-23T00:00:00+03:00"
  }
]
```

### POST /api/invitations/{invitation_id}/respond

```json
{ "accept": true }
```

`accept: false` daveti reddeder. Başarılı cevap 204, gövde yok.

### GET /api/classrooms/{classroom_id}/materials

Sorgu: `type` = `note` | `assignment`. Sınıfın not veya ödev paylaşımlarını döner.

```json
[
  {
    "id": "guid",
    "title": "1. Hafta Notu",
    "content": "Konu özeti",
    "type": "note",
    "file_url": null,
    "file_name": null,
    "file_type": null,
    "created_at": "2026-11-23T00:00:00+03:00"
  }
]
```

Dosya varsa `file_url` göreli yol veya indirme adresi, `file_name` orijinal ad, `file_type` MIME veya uzantı (`application/pdf`, `docx`, `txt` vb.) olur. Dosya indirme, gerektiğinde `access_token` sorgu parametresiyle yapılır.

### POST /api/classrooms/{classroom_id}/materials

`multipart/form-data`. Alanlar: `title`, `content`, `type` (`note` | `assignment`), isteğe bağlı `file` (`pdf`, `doc`, `docx`, `txt`). Yalnızca sınıfı yöneten akademisyen veya idari yükler. Öğrenci yalnızca okur ve indirir. Cevap tek materyal nesnesidir (GET öğesiyle aynı).

### GET /api/admin/users

Yalnız `admin`. Sorgu: `search` (isteğe bağlı).

```json
[
  {
    "id": "guid",
    "full_name": "Ali Veli",
    "email": "ali@okul.edu.tr",
    "role": "student",
    "can_create_club": false
  }
]
```

`role` değerleri `student` | `teacher` | `admin` olur.

### POST /api/admin/users

Yalnız `admin`. Gövde:

```json
{
  "email": "yeni@okul.edu.tr",
  "password": "enaz6karakter",
  "role": "student"
}
```

Cevap:

```json
{
  "id": "guid",
  "full_name": "E-postaya tanımlı isim",
  "email": "yeni@okul.edu.tr",
  "role": "student",
  "can_create_club": false
}
```

`full_name`, e-posta yerel kısmından veya kurum dizininden türetilir; mobil listedeki adı bu alandan gösterir.

### PATCH /api/admin/users/{user_id}

Yalnız `admin`. Gövde alanlarından en az biri gelir:

```json
{ "role": "teacher", "can_create_club": true }
```

Cevap, güncel kullanıcı nesnesidir (`GET /api/admin/users` öğesiyle aynı).

### DELETE /api/admin/users/{user_id}

Yalnız `admin`. Kullanıcıyı siler. Başarılı cevap 204, gövde yok. Yönetici kendi kaydını silemez.

## Hedef: kulüp dinamik rol ve alt birim (Faz 1)

Kulüp oluşturma `can_create_club` veya `system_role: admin` ister. `GET /api/auth/me` cevabında `can_create_club` (boolean) bulunur. Kulüp içi sohbet mobil tarafından kullanılmaz.

### POST /api/clubs

```json
{
  "name": "Yazılım Kulübü",
  "description": "Üniversite yazılım topluluğu",
  "category": "teknoloji",
  "logo_url": null
}
```

Cevap kulüp nesnesidir: `id`, `name`, `description`, `category`, `logo_url`, `created_by`, `created_at`, `membership`, `my_permissions`.

### PATCH /api/clubs/{club_id}

Gövde alanlarından en az biri: `name`, `description`, `category`, `logo_url`. `can_edit_club` gerekir.

### GET /api/clubs/{club_id}/roles

```json
[
  {
    "id": "guid",
    "name": "Mobil Alan Başkanı",
    "color": "#8B2635",
    "permissions": {
      "can_post_announcement": true,
      "can_manage_members": true,
      "can_manage_departments": false,
      "can_edit_club": false
    }
  }
]
```

### POST /api/clubs/{club_id}/roles

Gövde yukarıdaki rol şemasıyla aynıdır (`id` hariç).

### DELETE /api/clubs/{club_id}/roles/{role_id}

Özel rolü siler. 204.

### GET /api/clubs/{club_id}/departments

```json
[
  {
    "id": "guid",
    "name": "Mobil Geliştirme",
    "lead_user_id": "guid",
    "lead_full_name": "Ayşe Yılmaz"
  }
]
```

### POST /api/clubs/{club_id}/departments

```json
{ "name": "Mobil Geliştirme", "lead_user_id": "guid" }
```

### PATCH /api/clubs/{club_id}/members/{user_id}

```json
{ "role_ids": ["guid-1", "guid-2"], "department_id": "guid" }
```

`department_id` `null` olabilir. Bir üyeye birden fazla özel rol atanabilir.

### POST /api/clubs/{club_id}/announcements

```json
{
  "title": "Toplantı",
  "content": "Salı 18:00",
  "target_department_id": null
}
```

`target_department_id` `null` ise tüm kulüp; dolu ise yalnızca o alt birim. Liste cevabında `target_department_id` ve `target_department_name` döner. `GET /api/clubs/{club_id}/announcements` aynı şemayı listeler.

`GET /api/clubs/{club_id}` detay cevabı `members`, `roles`, `departments` ve `my_permissions` alanlarını içerir.

## Değişiklik günlüğü

- 2026-11-24: BACKEND_BAGLA — mobil `USE_MOCK` ve geliştirici rol önizlemesi kaldırıldı; servisler yalnızca sözleşme uçlarına istek atar. Kulüp Faz 1 uçları sözleşmeye eklendi.
- 2026-11-23: Sınıf üyesi içerik yetkisi için `GET /api/classes/{class_id}/members` ve `PATCH /api/classes/{class_id}/members/{student_id}/authority` eklendi. Yetkili öğrenci duyuru, not ve ödev ekleyebilir.
- 2026-11-23: Sınıfa sonradan öğrenci daveti için `GET /api/classes/{class_id}/eligible-students` ve `POST /api/classes/{class_id}/invitations` eklendi.
- 2026-11-23: Ders, sınıf grubu, davet, materyal ve idari kullanıcı yönetimi için hedef uçlar eklendi (`/api/courses`, `/api/users/me/courses`, `/api/classrooms`, `/api/invitations`, `/api/admin/users`). Wire `snake_case`; roller `student` | `teacher` | `admin`.
- 2026-11-21: Mobil katalog, öğrenim okuma ve yazmayı `GET /api/departments`, `GET /api/me/study` ve `PUT /api/me/study` üzerinden ister. `PUT` gövdesi `department_id` ve `course_ids` olarak kalır; tek `year` alanı yoktur. Katalog uç vermezse tohum liste aynı JSON şeklinde kullanılır. `PUT /api/users/{id}/role` cevabı 204 ve gövdesizdir; mobil listeyi yerelde günceller.
- 2026-11-21: Öğrenci, akademisyen ve idari seçimi giriş formundan önce yapılır. Akademisyen ve idari bölüm-ders adımını geçip giriş formuna gider. Giriş isteğinin gövdesi değişmez.
- 2026-11-21: Seçim ekranında ve profilde her sınıf ayrı açılır listedir. Başlık `{year}. Sınıf Dersleri` olur. API gövdesi değişmez.
- 2026-11-21: Öğrenci tek sınıf seçmez. Programı olan bölümde dört sınıfın dersleri birlikte seçilir. `GET /api/me/study` dersleri `years` altında gruplar. `PUT /api/me/study` gövdesinden tek `year` kalktı.
- 2026-11-21: İlk sözleşme. Mevcut uçlar, giriş kapısının istemci kontrolü, profil öğrenim kartı ve hedef bölüm–sınıf–ders API'si yazıldı.
