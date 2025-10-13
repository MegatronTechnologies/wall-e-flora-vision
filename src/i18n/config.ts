import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  az: {
    translation: {
      common: {
        loading: 'Yüklənir...',
        notAvailable: 'Mövcud deyil',
        error: 'Xəta baş verdi',
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
        validationError: 'Zəhmət olmasa bütün sahələri doldurun.',
        submitError: 'Sorğunu göndərmək mümkün olmadı.',
      },
      
      // Footer
      footer: {
        copyright: '© 2025 MegTech Team',
        subtitle: 'SAF 2025 üçün Azərbaycanda hazırlanmışdır',
      },
      
      // Dashboard
      dashboard: {
        detect: 'Detect 🌱',
        scan: 'Scan',
        upload: 'Şəkil yüklə',
        previousDetects: 'Əvvəlki Detektlər',
        detectId: 'Detekt ID',
        date: 'Tarix',
        status: 'Status',
        device: 'Cihaz',
        filterByStatus: 'Statusa görə filtrlə',
        filterByDevice: 'Cihaza görə filtrlə',
        searchPlaceholder: 'Deteksiya axtar',
        allStatuses: 'Bütün statuslar',
        noObjects: 'Obyekt tapılmadı',
        healthy: 'Sağlam',
        diseased: 'Xəstə',
        mixed: 'Qarışıq',
        details: 'Təfərrüatlar',
        confidence: 'Əminlik',
        additionalInfo: 'Əlavə məlumat',
        refreshImage: 'Şəkli yenilə',
        detectionImageAlt: 'Aşkarlama nəticəsi',
        metadata: {
          temperature: 'Temperatur',
          humidity: 'Rütubət',
        },
        loadError: 'Deteksiyaları yükləmək mümkün olmadı.',
        liveStream: 'Canlı yayın',
        streamNote: 'Raspberry Pi streaming xidmətinin aktiv olduğuna və əlçatan olduğuna əmin olun.',
        streamUnavailable: 'Stream URL konfiqurasiya edilməyib.',
        detectEndpointMissing: 'Detection endpoint konfiqurasiya edilməyib.',
        detectSuccess: 'Deteksiya sorğusu göndərildi',
        detectSuccessDescription: 'Yeni deteksiya bir neçə saniyəyə əlavə olunacaq.',
        detectError: 'Deteksiya sorğusu yerinə yetirilmədi.',
        newDetection: 'Yeni deteksiya',
        newDetectionDescription: 'Raspberry Pi-dən yeni məlumat gəldi.',
        delete: 'Sil',
        deleteSuccess: 'Deteksiya silindi',
        deleteSuccessDescription: 'Seçilmiş deteksiya uğurla silindi.',
        deleteError: 'Deteksiyanı silmək mümkün olmadı.',
        deleteConfirmTitle: 'Deteksiyanı silmək istəyirsiniz?',
        deleteConfirmDescription: 'Bu deteksiya birdəfəlik silinəcək.',
        noDetections: 'Hələ deteksiya yoxdur.',
        noDetectionsHint: 'Deteksiya etmək üçün “Detect” düyməsinə basın və ya Raspberry Pi bağlantısını yoxlayın.',
        noImage: 'Şəkil mövcud deyil',
        plantPlaceholder: 'Bitki',
        stats: {
          total: 'Ümumi deteksiyalar',
          healthy: 'Sağlam',
          diseased: 'Xəstə',
          lastDetection: 'Son deteksiya',
        },
        devices: {
          all: 'Bütün cihazlar',
        },
        time: {
          filter: 'Vaxta görə filtrlə',
          all: 'Bütün vaxtlar',
          last24h: 'Son 24 saat',
          last7d: 'Son 7 gün',
        },
      },
      
      // Admin
      admin: {
        title: 'SuperAdmin Panel',
        userId: 'İstifadəçi ID',
        name: 'Ad',
        email: 'Email',
        role: 'Rol',
        fullName: 'Tam ad',
        dateCreated: 'Yaradılma tarixi',
        create: 'Yarat',
        edit: 'Redaktə et',
        delete: 'Sil',
        saveChanges: 'Dəyişiklikləri saxla',
        totalUsers: 'Ümumi istifadəçi sayı',
        adminsCount: 'Admin sayı',
        usersCount: 'İstifadəçi sayı',
        searchPlaceholder: 'Ad və ya email ilə axtar',
        allRoles: 'Bütün rollar',
        sortNewest: 'Ən yenini göstər',
        sortOldest: 'Ən köhnəni göstər',
        actions: 'Əməliyyatlar',
        emptyState: 'Seçilmiş filtrə uyğun istifadəçi tapılmadı.',
        roles: {
          user: 'İstifadəçi',
          superadmin: 'Superadmin',
        },
        password: 'Parol',
        passwordPlaceholder: 'Ən azı 6 simvol',
        passwordHint: 'Yalnız yeni istifadəçi yaradarkən tələb olunur.',
        createUserTitle: 'Yeni istifadəçi yarat',
        createUserSubtitle: 'Email təsdiqli yeni istifadəçi yaradılacaq.',
        confirmPassword: 'Parolu təsdiqlə',
        togglePassword: 'Parolu göstər/gizlət',
        show: 'Göster',
        hide: 'Gizlət',
        editUserTitle: 'İstifadəçini redaktə et',
        editUserSubtitle: 'Email, ad və rolu yenilə.',
        createSuccess: 'İstifadəçi yaradıldı',
        createSuccessDesc: 'Yeni istifadəçi siyahıya əlavə olundu.',
        updateSuccess: 'İstifadəçi yeniləndi',
        updateSuccessDesc: 'İstifadəçi məlumatları uğurla saxlanıldı.',
        saveError: 'Məlumatı saxlamaq mümkün olmadı.',
        loadError: 'İstifadəçilər yüklənmədi.',
        deleteSuccess: 'İstifadəçi silindi',
        deleteSuccessDesc: 'Seçilmiş istifadəçi sistemdən silindi.',
        deleteError: 'İstifadəçini silmək mümkün olmadı.',
        deleteConfirmTitle: 'İstifadəçini silmək istəyirsiniz?',
        deleteConfirmDesc: '{{email}} hesabı tamamilə silinəcək. Bu əməliyyat geri qaytarılmır.',
        authRequired: 'Bu funksiyanı istifadə etmək üçün superadmin kimi daxil olmalısınız.',
        authHelp: 'Lokal demoda bu funksional işləməyə bilər. Production mühitində superadmin hesabı ilə login olun.',
        edgeFunctionUnavailable: 'Edge Function əlçatan deyil. Lovable/Supabase layihənizdə `manage-users` funksiyasını deploy edin və şəbəkə çıxışını yoxlayın.',
        edgeFunctionUnavailableTitle: 'Edge Function əlçatan deyil',
        edgeFunctionHelp: 'Supabase CLI ilə `supabase functions deploy manage-users` icra edin və `VITE_SUPABASE_URL` ünvanına girişin mümkün olduğunu yoxlayın.',
      },
      
      // Modal
      modal: {
        close: 'Bağla',
        inDevelopment: 'Bu funksiya hazırlanır',
      },
      auth: {
        missingCredentials: 'Email və parol boş ola bilməz.',
        genericError: 'Daxil olarkən problem yarandı.',
        signupMissing: 'Bütün sahələri doldurun.',
        passwordTooShort: 'Parol ən azı 6 simvoldan ibarət olmalıdır.',
        loginSuccess: 'Uğurla daxil oldunuz.',
        signupSuccess: 'Hesab yaradıldı.',
        verifyEmail: 'Lütfən emailinizə göndərilən təsdiq linkinə baxın.',
        passwordMismatch: 'Parollar uyğun gəlmir.',
      },
    },
  },
  eng: {
    translation: {
      common: {
        loading: 'Loading...',
        notAvailable: 'N/A',
        error: 'Something went wrong',
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
        validationError: 'Please fill out all fields.',
        submitError: 'Failed to submit your request.',
      },
      
      // Footer
      footer: {
        copyright: '© 2025 MegTech Team',
        subtitle: 'Developed by MegTech Team for SAF 2025 — Azerbaijan',
      },
      
      // Dashboard
      dashboard: {
        detect: 'Detect 🌱',
        scan: 'Scan',
        upload: 'Upload Photo',
        previousDetects: 'Previous Detects',
        detectId: 'Detect ID',
        date: 'Date',
        status: 'Status',
        device: 'Device',
        filterByStatus: 'Filter by status',
        filterByDevice: 'Filter by device',
        searchPlaceholder: 'Search detections',
        allStatuses: 'All statuses',
        noObjects: 'No Objects Detected',
        healthy: 'Healthy',
        diseased: 'Diseased',
        mixed: 'Mixed',
        details: 'Details',
        confidence: 'Confidence',
        additionalInfo: 'Additional Info',
        refreshImage: 'Refresh image',
        detectionImageAlt: 'Detection result',
        metadata: {
          temperature: 'Temperature',
          humidity: 'Humidity',
        },
        loadError: 'Failed to load detections.',
        liveStream: 'Live Stream',
        streamNote: 'Ensure the Raspberry Pi streaming service is running and accessible.',
        streamUnavailable: 'Stream URL not configured.',
        detectEndpointMissing: 'Detection endpoint is not configured.',
        detectSuccess: 'Detection requested',
        detectSuccessDescription: 'A new detection will appear shortly.',
        detectError: 'Failed to trigger detection.',
        newDetection: 'New detection received',
        newDetectionDescription: 'A new detection has been added.',
        delete: 'Delete',
        deleteSuccess: 'Detection deleted',
        deleteSuccessDescription: 'The detection has been removed.',
        deleteError: 'Failed to delete detection.',
        deleteConfirmTitle: 'Delete detection?',
        deleteConfirmDescription: 'This detection will be permanently removed.',
        noDetections: 'No detections yet.',
        noDetectionsHint: 'Press Detect to capture a new snapshot or verify the Raspberry Pi connection.',
        noImage: 'No image available',
        plantPlaceholder: 'Plant',
        stats: {
          total: 'Total detections',
          healthy: 'Healthy',
          diseased: 'Diseased',
          lastDetection: 'Last detection',
        },
        devices: {
          all: 'All devices',
        },
        time: {
          filter: 'Filter by time',
          all: 'All time',
          last24h: 'Last 24 hours',
          last7d: 'Last 7 days',
        },
      },
      
      // Admin
      admin: {
        title: 'SuperAdmin Panel',
        userId: 'User ID',
        name: 'Name',
        email: 'Email',
        role: 'Role',
        fullName: 'Full name',
        dateCreated: 'Date Created',
        create: 'Create',
        edit: 'Edit',
        delete: 'Delete',
        saveChanges: 'Save changes',
        totalUsers: 'Total users',
        adminsCount: 'Admins',
        usersCount: 'Regular users',
        searchPlaceholder: 'Search by name or email',
        allRoles: 'All roles',
        sortNewest: 'Show newest first',
        sortOldest: 'Show oldest first',
        actions: 'Actions',
        emptyState: 'No users match the current filters.',
        roles: {
          user: 'User',
          superadmin: 'Superadmin',
        },
        password: 'Password',
        passwordPlaceholder: 'At least 6 characters',
        passwordHint: 'Only required when creating a new user.',
        createUserTitle: 'Create new user',
        createUserSubtitle: 'A new user will be created with email confirmed.',
        confirmPassword: 'Confirm password',
        togglePassword: 'Toggle password visibility',
        show: 'Show',
        hide: 'Hide',
        editUserTitle: 'Edit user',
        editUserSubtitle: 'Update email, name, and role.',
        createSuccess: 'User created',
        createSuccessDesc: 'The new user has been added to the list.',
        updateSuccess: 'User updated',
        updateSuccessDesc: 'User details have been saved.',
        saveError: 'Could not save the user. Please try again.',
        loadError: 'Failed to load users.',
        deleteSuccess: 'User deleted',
        deleteSuccessDesc: 'The selected user has been removed.',
        deleteError: 'Failed to delete the user.',
        deleteConfirmTitle: 'Delete this user?',
        deleteConfirmDesc: '{{email}} will be permanently removed. This action cannot be undone.',
        authRequired: 'You must be signed in as a superadmin to manage users.',
        authHelp: 'In local demos this may be disabled. In production, log in with a superadmin account.',
        edgeFunctionUnavailable: 'Unable to reach the edge function. Deploy `manage-users` on Supabase and ensure network access.',
        edgeFunctionUnavailableTitle: 'Edge function unreachable',
        edgeFunctionHelp: 'Deploy the `manage-users` function via Supabase CLI and ensure your `VITE_SUPABASE_URL` is accessible from this environment.',
      },
      
      // Modal
      modal: {
        close: 'Close',
        inDevelopment: 'Feature in development',
      },
      auth: {
        missingCredentials: 'Email and password are required.',
        genericError: 'Something went wrong while logging in.',
        signupMissing: 'Please fill out all fields.',
        passwordTooShort: 'Password must be at least 6 characters.',
        loginSuccess: 'Logged in successfully.',
        signupSuccess: 'Account created successfully.',
        verifyEmail: 'Please check your inbox to verify your email address.',
        passwordMismatch: 'Passwords do not match.',
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
