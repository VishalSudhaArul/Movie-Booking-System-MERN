const Booking = require("../models/Booking");

exports.getAnalytics = async (req,res)=>{
try{

const { startDate, endDate } = req.query;

let matchStage = {};

if (startDate && endDate) {
  matchStage = {
    createdAt: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    }
  };
}

/* ---------------- MOVIE COLLECTION ---------------- */

const movieStats = await Booking.aggregate([
{ $match: matchStage },

{
  $lookup:{
    from:"shows",
    localField:"showId",
    foreignField:"_id",
    as:"show"
  }
},
{$unwind:"$show"},

{
  $lookup:{
    from:"movies",
    localField:"show.movieId",
    foreignField:"_id",
    as:"movie"
  }
},
{$unwind:"$movie"},

{
  $group:{
    _id:"$movie._id",
    title:{$first:"$movie.title"},
    poster:{$first:"$movie.poster"},
    ticketsSold:{$sum:{$size:"$seats"}},
    ticketRevenue:{
      $sum:{
        $multiply:[{$size:"$seats"},200]
      }
    }
  }
}
]);


/* ---------------- THEATRE COLLECTION ---------------- */

const theatreStats = await Booking.aggregate([
{ $match: matchStage },

{
  $lookup:{
    from:"shows",
    localField:"showId",
    foreignField:"_id",
    as:"show"
  }
},
{$unwind:"$show"},

{
  $lookup:{
    from:"movies",
    localField:"show.movieId",
    foreignField:"_id",
    as:"movie"
  }
},
{$unwind:"$movie"},

{
  $addFields:{
    seatRevenue:{
      $multiply:[{$size:"$seats"},200]
    },

    snackRevenue:{
      $reduce:{
        input:"$snacks",
        initialValue:0,
        in:{
          $add:[
            "$$value",
            {$multiply:["$$this.price","$$this.qty"]}
          ]
        }
      }
    },

    parkingRevenue:{
      $ifNull:["$parking.price",0]
    }
  }
},

{
  $group:{
    _id:{
      theatre:"$show.theatre",
      movie:"$movie.title"
    },

    movieRevenue:{$sum:"$seatRevenue"},
    snackRevenue:{$sum:"$snackRevenue"},
    parkingRevenue:{$sum:"$parkingRevenue"}
  }
},

{
  $group:{
    _id:"$_id.theatre",

    movies:{
      $push:{
        title:"$_id.movie",
        revenue:"$movieRevenue"
      }
    },

    ticketRevenue:{$sum:"$movieRevenue"},
    snackRevenue:{$sum:"$snackRevenue"},
    parkingRevenue:{$sum:"$parkingRevenue"}
  }
},

{
  $addFields:{
    totalRevenue:{
      $add:["$ticketRevenue","$snackRevenue","$parkingRevenue"]
    }
  }
}
]);


/* ---------------- SUMMARY ---------------- */

const totalBookings = await Booking.countDocuments(matchStage);

const totalRevenue = await Booking.aggregate([
{ $match: matchStage },
{$group:{_id:null,total:{$sum:"$totalPrice"}}}
]);

res.json({
  movieStats,
  theatreStats,
  summary:{
    totalBookings,
    totalRevenue: totalRevenue[0]?.total || 0
  }
});

}catch(err){
res.status(500).json(err);
}
};
