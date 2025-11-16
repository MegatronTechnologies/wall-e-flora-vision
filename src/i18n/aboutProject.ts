export const aboutProjectTranslations = {
  az: {
    aboutProject: {
      title: 'Wall-E Plant Doctor',
      subtitle: 'Bitki sağlamlığını izləmək və xəstəlikləri erkən mərhələdə aşkar etmək üçün hazırlanmış süni intellekt əsaslı robotik sistem',
      description: {
        intro: 'Wall-E Plant Doctor, bitkilərin sağlamlıq vəziyyətini izləmək və xəstəlik-zərərvericiləri erkən mərhələdə aşkar etmək üçün hazırlanmış süni intellekt əsaslı robotik sistemdir. Pixar-ın Wall-E obrazından ilhamlanan robot tamamilə 3D printerlə hazırlanmış korpusa, Raspberry Pi 5 mini-kompüterinə və yüksək dəqiqliyə malik Intel RealSense D455 dərinlik kamerasına sahibdir.',
        technology: 'Robotun mexaniki hissələri Arduino Uno tərəfindən idarə olunur və bir neçə servo və DC motor vasitəsilə hərəkət edə bilir. Kamera lazım olan istiqamətə yönəldilir və bitkinin görüntüsü çəkilir.',
        aiCore: 'Daha sonra Raspberry Pi üzərində çalışan YOLOv8 süni intellekt modeli bu görüntünü emal edərək bitkidə xəstəlik əlamətləri, zərərverici izləri (məsələn, mealybug) və digər potensial problemləri müəyyən edir.',
      },
      featuresTitle: 'Əsas Xüsusiyyətlər',
      features: {
        robot: '3D printerlə hazırlanmış Wall-E korpusu',
        camera: 'Intel RealSense D455 dərinlik kamerası',
        ai: 'Raspberry Pi 5 + YOLOv8 AI modeli',
        detection: 'Xrizantema və mealybug aşkarlanması',
      },
      howItWorksTitle: 'Necə İşləyir?',
      howItWorks: {
        step1: 'İstifadəçi veb tətbiqdə "Detect" düyməsinə basır',
        step2: 'Raspberry Pi-də YOLOv8 modeli görüntünü emal edir',
        step3: 'Sistem xrizantema bitkilərini və zərərvericiləri (mealybug) aşkar edir',
        step4: 'Nəticələr, şəkillər və status məlumatları real vaxtda göstərilir',
      },
      goalsTitle: 'Məqsəd',
      goals: 'Layihənin əsas məqsədi bitki sağlamlığı problemlərinin erkən aşkarlanmasını sadələşdirmək və avtomatlaşdırmaqdır. Bu, məhsul itkilərini azaltmağa, artıq pestisidlərin istifadəsini məhdudlaşdırmağa və daha davamlı kənd təsərrüfatı praktikalarını dəstəkləməyə kömək edir.',
      impactTitle: 'Təsir',
      impact: 'Ev bağbanları üçün bitkiləri izləmək üçün asan yol təqdim edir. Təhsil sahəsində isə tələbələr üçün robotika, kodlaşdırma, AI, elektronika və bitki elmlərini birləşdirən əməli STEAM layihəsi kimi çıxış edir.',
      futureTitle: 'Gələcək Planlar',
      future: 'Wall-E Plant Doctor süni intellektin və robotikaların gündəlik kənd təsərrüfatı çətinliklərini həll edə biləcəyini göstərir. Gələcək inkişafla sistem daha çox bitki növünü dəstəkləyə, əlavə xəstəlikləri tanıya və fermerlər, tədqiqatçılar və bitki həvəskarları üçün etibarlı köməkçi ola bilər.',
    },
  },
  eng: {
    aboutProject: {
      title: 'Wall-E Plant Doctor',
      subtitle: 'An innovative AI-powered robot designed to monitor plant health and detect diseases at early stages',
      description: {
        intro: 'Wall-E Plant Doctor is an innovative AI-powered robot designed to monitor plant health by detecting diseases and pests through advanced computer vision. Built with a custom 3D-printed body inspired by Pixar\'s Wall-E, the robot combines modern hardware and intelligent software to create an accessible tool for agriculture, education, and home gardening.',
        technology: 'The robot uses a Raspberry Pi 5 for real-time processing and an Intel RealSense D455 depth camera, which provides both RGB and precise 3D depth information. An Arduino Uno controls the robot\'s motors, enabling smooth movement and the ability to position the camera from different angles.',
        aiCore: 'At the core of the system is a YOLOv8 deep-learning model trained to recognize specific plants and detect early signs of pests such as mealybugs, as well as visual symptoms of disease.',
      },
      featuresTitle: 'Key Features',
      features: {
        robot: '3D-printed Wall-E inspired body',
        camera: 'Intel RealSense D455 depth camera',
        ai: 'Raspberry Pi 5 + YOLOv8 AI model',
        detection: 'Chrysanthemum and mealybug detection',
      },
      howItWorksTitle: 'How It Works',
      howItWorks: {
        step1: 'User presses the "Detect" button in the web application',
        step2: 'YOLOv8 model on Raspberry Pi processes the captured image',
        step3: 'System detects chrysanthemum plants and mealybug pests',
        step4: 'Results, images, and status information are displayed in real-time',
      },
      goalsTitle: 'Goals',
      goals: 'The main goal of the project is to simplify and automate the early detection of plant health problems. This helps reduce crop losses, decreases the need for excess pesticides, and supports more sustainable farming practices.',
      impactTitle: 'Impact',
      impact: 'For home gardeners, it provides an easy way to monitor plants without advanced agricultural knowledge. As an interdisciplinary STEAM project, it brings together robotics, coding, AI, electronics, and plant science for hands-on learning.',
      futureTitle: 'Future Vision',
      future: 'Wall-E Plant Doctor demonstrates how robotics and artificial intelligence can help solve everyday agricultural challenges. With further development, the system can be expanded to support more plant species, recognize additional diseases, and become a reliable assistant for farmers, researchers, and plant enthusiasts.',
    },
  },
};
