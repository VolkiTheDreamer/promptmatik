# Promptmatik ⚡

Promptmatik, gelişmiş yapay zeka promptları oluşturmak ve bunları yerel tarayıcınız üzerinden güvenli bir şekilde test etmek için tasarlanmış tek sayfalık (SPA) modern bir web uygulamasıdır.

## 🚀 Özellikler

*   **Dinamik Senaryolar:** Hazır konu şablonları arasından seçim yaparak form alanlarının placeholder değerlerini anında güncelleyebilirsiniz.
*   **Prompt Derleme:** Girdiğiniz rol, ton, hedef kitle, çıktı biçimi gibi prompt bileşenlerini gerçek zamanlı olarak tek bir yapılandırılmış promptta birleştirir.
*   **Güvenli API Saklama:** API anahtarlarınız tarayıcıda plain-text olarak tutulmaz. Belirleyeceğiniz bir PIN kodu ile tarayıcınızda AES-256 algoritmasıyla şifrelenmiş olarak saklanır ve yalnızca oturumunuz açıkken RAM bellekte tutulur.
*   **Gelişmiş CORS Çözümü (Vite Proxy):** Yerel geliştirme ortamında tarayıcıların API CORS kısıtlamalarına takılmaması için yerleşik Vite proxy sunucusu entegrasyonu mevcuttur.
*   **Çoklu Model Desteği:** Google Gemini, OpenAI, Deepseek, Anthropic ve OpenRouter (tüm modeller) doğrudan arayüzden seçilebilir ve çalıştırılabilir.
*   **Karanlık/Açık Tema:** Tamamen responsive tasarım ve göz yormayan modern arayüz temaları.

---

## 🛠️ Kurulum ve Çalıştırma

Yerel bilgisayarınızda çalıştırmak için aşağıdaki adımları uygulayın:

### 1. Projeyi Klonlayın
```bash
git clone <repository-url>
cd promptmatik
```

### 2. Bağımlılıkları Yükleyin
```bash
npm install
```

### 3. Geliştirici Sunucusunu Başlatın
```bash
npm run dev
```
Sunucu çalıştıktan sonra tarayıcınızdan `http://localhost:5173` adresine giderek uygulamayı kullanmaya başlayabilirsiniz.

### 4. Üretim Derlemesi Alın (Production Build)
```bash
npm run build
```
Derleme çıktısı `dist/` klasörü içerisine oluşturulacaktır.

---

## 🔒 Güvenlik Notu
*   API anahtarlarınız hiçbir uzak sunucuya gönderilmez. Tamamen tarayıcınızın `localStorage` alanında, sizin belirlediğiniz PIN koduyla **CryptoJS (AES)** kullanılarak şifrelenir.
*   Oturumu kapattığınızda veya sayfayı yenilediğinizde çözülmüş anahtar RAM bellekten tamamen silinir.
