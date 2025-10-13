import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  az: {
    translation: {
      common: {
        loading: 'Yüklənir...',
        notAvailable: 'Mövcud deyil',
      },
      // Navbar
      login: 'Daxil ol',
      signup: 'Qeydiyyat',
      logout: 'Çıxış',
      
      // Landing
      hero: {
        title: 'Wall-E — bitkilərə qayğı göstərən robot',
        subtitle: 'Süni intellekt əsaslı bitki sağlamlığı detektoru. SAF 2025 üçün MegTech tərəfindən hazırlanmışdır.',
        getStarted: 'Başla',
      },
      
      // About
      about: {
        title: 'Haqqımızda',
        description: 'MegTech — Aydın Sulxayev və Nihat Muradli tərəfindən təşkil edilmiş innovativ komandadır. Biz SAF 2025-də Azərbaycanı təmsil edir və AI texnologiyaları vasitəsilə kənd təsərrüfatını inkişaf etdiririk.',
      },
      
      // Contact
      contact: {
        title: 'Əlaqə',
        name: 'Ad',
        email: 'Email',
        message: 'Mesaj',
        send: 'Göndər',
        success: 'Mesajınız göndərildi!',
      },
      
      // Footer
      footer: {
        copyright: '© 2025 MegTech Team',
        subtitle: 'SAF 2025 üçün Azərbaycanda hazırlanmışdır',
      },
      
      // Dashboard
      dashboard: {
        detect: 'Detect 🌱',
        upload: 'Şəkil yüklə',
        previousDetects: 'Əvvəlki Detektlər',
        detectId: 'Detekt ID',
        date: 'Tarix',
        status: 'Status',
        device: 'Cihaz',
        filterByStatus: 'Statusa görə filtrlə',
        allStatuses: 'Bütün statuslar',
        noObjects: 'Obyekt tapılmadı',
        healthy: 'Sağlam',
        diseased: 'Xəstə',
        mixed: 'Qarışıq',
        details: 'Təfərrüatlar',
        confidence: 'Əminlik',
        noDetections: 'Hələ deteksiya yoxdur. Raspberry Pi məlumatı gözlənilir...',
        additionalInfo: 'Əlavə məlumat',
        refreshImage: 'Şəkli yenilə',
        detectionImageAlt: 'Aşkarlama nəticəsi',
        metadata: {
          temperature: 'Temperatur',
          humidity: 'Rütubət',
        },
      },
      
      // Admin
      admin: {
        title: 'SuperAdmin Panel',
        userId: 'İstifadəçi ID',
        name: 'Ad',
        email: 'Email',
        role: 'Rol',
        dateCreated: 'Yaradılma tarixi',
        create: 'Yarat',
        edit: 'Redaktə et',
        delete: 'Sil',
        totalUsers: 'Ümumi istifadəçi sayı',
        adminsCount: 'Admin sayı',
        usersCount: 'İstifadəçi sayı',
        searchPlaceholder: 'Ad və ya email ilə axtar',
        allRoles: 'Bütün rollar',
        sortNewest: 'Ən yenini göstər',
        sortOldest: 'Ən köhnəni göstər',
        actions: 'Əməliyyatlar',
        emptyState: 'Seçilmiş filtrə uyğun istifadəçi tapılmadı.',
      },
      
      // Modal
      modal: {
        close: 'Bağla',
        inDevelopment: 'Bu funksiya hazırlanır',
      },
    },
  },
  eng: {
    translation: {
      common: {
        loading: 'Loading...',
        notAvailable: 'N/A',
      },
      // Navbar
      login: 'Login',
      signup: 'Sign Up',
      logout: 'Logout',
      
      // Landing
      hero: {
        title: 'Wall-E — the robot that cares for plants',
        subtitle: 'AI-powered plant health detector. Developed by MegTech for SAF 2025.',
        getStarted: 'Get Started',
      },
      
      // About
      about: {
        title: 'About Us',
        description: 'MegTech is an innovative team formed by Aydın Sulxayev and Nihat Muradli. We represent Azerbaijan at SAF 2025 and develop agriculture through AI technologies.',
      },
      
      // Contact
      contact: {
        title: 'Contact',
        name: 'Name',
        email: 'Email',
        message: 'Message',
        send: 'Send',
        success: 'Your message has been sent!',
      },
      
      // Footer
      footer: {
        copyright: '© 2025 MegTech Team',
        subtitle: 'Developed by MegTech Team for SAF 2025 — Azerbaijan',
      },
      
      // Dashboard
      dashboard: {
        detect: 'Detect 🌱',
        upload: 'Upload Photo',
        previousDetects: 'Previous Detects',
        detectId: 'Detect ID',
        date: 'Date',
        status: 'Status',
        device: 'Device',
        filterByStatus: 'Filter by status',
        allStatuses: 'All statuses',
        noObjects: 'No Objects Detected',
        healthy: 'Healthy',
        diseased: 'Diseased',
        mixed: 'Mixed',
        details: 'Details',
        confidence: 'Confidence',
        noDetections: 'No detections yet. Waiting for Raspberry Pi data...',
        additionalInfo: 'Additional Info',
        refreshImage: 'Refresh image',
        detectionImageAlt: 'Detection result',
        metadata: {
          temperature: 'Temperature',
          humidity: 'Humidity',
        },
      },
      
      // Admin
      admin: {
        title: 'SuperAdmin Panel',
        userId: 'User ID',
        name: 'Name',
        email: 'Email',
        role: 'Role',
        dateCreated: 'Date Created',
        create: 'Create',
        edit: 'Edit',
        delete: 'Delete',
        totalUsers: 'Total users',
        adminsCount: 'Admins',
        usersCount: 'Regular users',
        searchPlaceholder: 'Search by name or email',
        allRoles: 'All roles',
        sortNewest: 'Show newest first',
        sortOldest: 'Show oldest first',
        actions: 'Actions',
        emptyState: 'No users match the current filters.',
      },
      
      // Modal
      modal: {
        close: 'Close',
        inDevelopment: 'Feature in development',
      },
    },
  },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'eng',
    fallbackLng: 'eng',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
